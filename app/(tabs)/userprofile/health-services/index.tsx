import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../../../components/UserContext';
import { supabase } from '../../../../lib/supabase';
import { 
  initHealthKit, 
  initAndroidHealth, 
  FitnessDataSource,
  saveFitnessConnection,
  fetchAndStoreDailyHealthData
} from '../../../../lib/fitness';
import { useTheme } from '../../../../lib/ThemeContext';

// Check if running in simulator
const isSimulator = Platform.OS === 'ios' && 
  (NativeModules.RNDeviceInfo?.isEmulator || process.env.NODE_ENV === 'development');

// Import AppleHealthKit with proper handling
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    const RNHealth = require('react-native-health');
    AppleHealthKit = RNHealth?.default;
    
    if (!AppleHealthKit?.initHealthKit) {
      console.warn('HealthKit module loaded but missing required functions');
      AppleHealthKit = null;
    }
  } catch (e) {
    console.error('Error importing react-native-health:', e);
  }
}

interface FitnessConnection {
  type: FitnessDataSource;
  connected: boolean;
  last_synced: string | null;
}

export default function HealthServices() {
  const { user, settings } = useUser();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<{
    apple_health?: boolean;
    health_connect?: boolean;
  }>({});
  const [syncing, setSyncing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_fitness_connections')
        .select('type, connected, last_synced')
        .eq('user_id', user.id);

      if (error) throw error;

      const connectionState = data?.reduce((acc: Record<string, boolean>, curr: FitnessConnection) => ({
        ...acc,
        [curr.type]: curr.connected,
      }), {}) || {};

      setConnections(connectionState);
    } catch (error) {
      console.error('Error loading connections:', error);
      Alert.alert('Error', 'Failed to load fitness connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (source: FitnessDataSource) => {
    try {
      setLoading(true);
      setPermissionError(null);

      if (source === 'apple_health') {
        // Check platform
        if (Platform.OS !== 'ios') {
          setPermissionError('Apple Health is only available on iOS devices.');
          return;
        }

        // Handle simulator environment
        if (isSimulator) {
          console.warn('Running in simulator - using mock HealthKit data');
          await handleSimulatorConnection(source);
          return;
        }

        // Show permission request dialog
        Alert.alert(
          'Health Data Access',
          'CTP needs access to your health data to track your activities. We will request access to:\n\n' +
          '• Steps\n' +
          '• Distance\n' +
          '• Active Energy\n' +
          '• Exercise Time\n' +
          '• Sleep Analysis\n\n' +
          'You can manage these permissions at any time in Settings.',
          [
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  const healthKitInitialized = await initHealthKit();
                  
                  if (!healthKitInitialized) {
                    setPermissionError(
                      'Unable to access Health data. Please:\n\n' +
                      '1. Open Settings > Privacy & Security > Health\n' +
                      '2. Find CTP in the list\n' +
                      '3. Enable all categories\n' +
                      '4. Return to CTP and try connecting again'
                    );
                    return;
                  }

                  await updateConnectionStatus(source, true);
                  await handleSync();
                  
                  Alert.alert(
                    'Success',
                    'Successfully connected to Apple Health. Your health data will now sync automatically.'
                  );
                } catch (error) {
                  console.error('Error during HealthKit setup:', error);
                  setPermissionError('Failed to set up HealthKit. Please try again.');
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
            }
          ]
        );
      } else if (source === 'health_connect') {
        const healthConnectInitialized = await initAndroidHealth();
        if (!healthConnectInitialized) {
          setPermissionError('Unable to connect to Health Connect. Please ensure you have granted the necessary permissions.');
          return;
        }

        // Update connection status
        const { error } = await supabase
          .from('user_fitness_connections')
          .upsert({
            user_id: user?.id,
            type: source,
            connected: true,
            status: 'connected',
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;

        // Update local state
        setConnections(prev => ({
          ...prev,
          [source]: true,
        }));

        // Initial sync
        await handleSync();
        
        Alert.alert(
          'Success',
          'Successfully connected to Health Connect. Your health data will now sync automatically.'
        );
      }
    } catch (error) {
      console.error('Error connecting:', error);
      Alert.alert('Error', 'Failed to connect to health services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatorConnection = async (source: FitnessDataSource) => {
    try {
      await updateConnectionStatus(source, true);
      await handleSync();
      
      Alert.alert(
        'Simulator Mode',
        'Connected to Health services in simulator mode. Mock data will be used for testing.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error in simulator connection:', error);
      setPermissionError('Failed to set up simulator connection. Please try again.');
    }
  };

  const updateConnectionStatus = async (source: FitnessDataSource, connected: boolean) => {
    try {
      if (!user?.id) throw new Error('User not authenticated');

      await saveFitnessConnection(user.id, {
        type: source,
        connected,
        status: connected ? 'connected' : 'disconnected',
        permissions: [],
      });

      setConnections(prev => ({
        ...prev,
        [source]: connected,
      }));
    } catch (error) {
      console.error('Error updating connection status:', error);
      throw error;
    }
  };

  const handleDisconnect = async (source: FitnessDataSource) => {
    Alert.alert(
      'Disconnect Health Service',
      'Are you sure you want to disconnect? Your existing health data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await updateConnectionStatus(source, false);
            } catch (error) {
              console.error('Error disconnecting:', error);
              Alert.alert('Error', 'Failed to disconnect health service');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Use the existing fetchAndStoreDailyHealthData function
      const { fetchAndStoreDailyHealthData } = await import('../../../../lib/fitness');
      
      // Sync last 7 days of data
      const promises = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        promises.push(fetchAndStoreDailyHealthData(currentUser.id, date));
      }
      
      await Promise.all(promises);
      
      Alert.alert('Success', 'Health data synced successfully');
    } catch (error) {
      console.error('Error syncing:', error);
      Alert.alert('Error', 'Failed to sync health data');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isSimulator && (
        <View style={styles.simulatorBanner}>
          <Ionicons name="information-circle" size={24} color="#fff" />
          <Text style={styles.simulatorText}>
            Running in Simulator Mode - Using mock health data
          </Text>
        </View>
      )}
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Connect to your device's health services to automatically track your activities
        </Text>

        {permissionError && (
          <View style={[styles.errorCard, { backgroundColor: '#FF3B30' }]}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.errorText}>{permissionError}</Text>
          </View>
        )}

        {Platform.OS === 'ios' && (
          <View style={[styles.connectionCard, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            ...theme.elevation.small,
          }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="heart" size={24} color="#FF2D55" />
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Apple Health</Text>
            </View>
            
            <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
              Sync your activities, workouts, and health data from Apple Health
            </Text>

            {connections.apple_health ? (
              <>
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.connectedText}>Connected</Text>
                </View>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.syncButton]}
                    onPress={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sync" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Sync Now</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.disconnectButton]}
                    onPress={() => handleDisconnect('apple_health')}
                  >
                    <Text style={styles.buttonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.connectButton]}
                onPress={() => handleConnect('apple_health')}
              >
                <Text style={styles.buttonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {Platform.OS === 'android' && (
          <View style={[styles.connectionCard, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            ...theme.elevation.small,
          }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="fitness" size={24} color="#4CAF50" />
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Health Connect</Text>
            </View>
            
            <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
              Sync your activities and health data from Android Health Connect
            </Text>

            {connections.health_connect ? (
              <>
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.connectedText}>Connected</Text>
                </View>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.syncButton]}
                    onPress={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sync" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Sync Now</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.disconnectButton]}
                    onPress={() => handleDisconnect('health_connect')}
                  >
                    <Text style={styles.buttonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.connectButton]}
                onPress={() => handleConnect('health_connect')}
              >
                <Text style={styles.buttonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="information-circle" size={24} color={theme.colors.textSecondary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Your health data is stored securely and is only used to track your progress in challenges.
            You can disconnect these services at any time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
  },
  connectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  connectedText: {
    marginLeft: 6,
    color: '#4CAF50',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  connectButton: {
    backgroundColor: '#000',
  },
  syncButton: {
    backgroundColor: '#2196F3',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
  },
  simulatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    marginBottom: 16,
  },
  simulatorText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
}); 