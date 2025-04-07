import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  ActivityIndicator, 
  Platform, 
  Alert,
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { useTheme } from '../../../lib/ThemeContext';
import { Card } from '../../../components/ui/Card';
import { isHealthKitAvailable, initHealthKit, getHealthKitAuthStatus, fetchHealthData } from '../../../lib/health';
import { supabase } from '../../../lib/supabase';
import * as Device from 'expo-device';

interface ConnectionStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  isConnected: boolean;
  lastSynced: string | null;
  isSimulator: boolean;
}

export default function HealthConnections() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthKitStatus, setHealthKitStatus] = useState<ConnectionStatus>({
    isAvailable: false,
    isAuthorized: false,
    isConnected: false,
    lastSynced: null,
    isSimulator: false
  });

  useEffect(() => {
    if (user && !authLoading) {
      checkHealthKitStatus();
    }
  }, [user, authLoading]);

  const checkHealthKitStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if this is a simulator
      const isSimulator = Device.isDevice === false;
      
      // On simulator, HealthKit won't be fully functional
      if (isSimulator) {
        console.log('Running on simulator, HealthKit may not work properly');
        
        // Get connection status from database
        const { data: connectionData } = await supabase
          .from('user_fitness_connections')
          .select('connected, last_synced, status')
          .eq('user_id', user.id)
          .eq('type', 'apple_health')
          .maybeSingle();
        
        setHealthKitStatus({
          isAvailable: false,
          isAuthorized: false,
          isConnected: connectionData?.connected || false,
          lastSynced: connectionData?.last_synced || null,
          isSimulator
        });
        return;
      }
      
      // Check if HealthKit is available on this device
      const isAvailable = Platform.OS === 'ios' ? await isHealthKitAvailable() : false;
      
      // Get connection status from database
      const { data: connectionData } = await supabase
        .from('user_fitness_connections')
        .select('connected, last_synced, status')
        .eq('user_id', user.id)
        .eq('type', 'apple_health')
        .maybeSingle();
      
      // Check authorization status if available
      let authStatus = { authorized: false };
      if (isAvailable) {
        authStatus = await getHealthKitAuthStatus();
      }
      
      setHealthKitStatus({
        isAvailable,
        isAuthorized: authStatus.authorized,
        isConnected: connectionData?.connected || false,
        lastSynced: connectionData?.last_synced || null,
        isSimulator
      });
    } catch (error) {
      console.error('Error checking health connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectHealthKit = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      // Initialize HealthKit and request permissions
      const success = await initHealthKit();
      
      if (success) {
        // Fetch health data after successful permission
        await fetchHealthData();
        
        // Refresh status
        await checkHealthKitStatus();
        
        Alert.alert(
          'Success',
          'Health data connected successfully. Your step count, distance, and calories will sync automatically.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable Health permissions to connect your health data.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error connecting to HealthKit:', error);
      Alert.alert('Error', 'Failed to connect to Health. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      // Fetch latest health data
      const data = await fetchHealthData();
      
      // Refresh status
      await checkHealthKitStatus();
      
      Alert.alert(
        'Sync Complete',
        `Updated with latest data: ${data.steps} steps, ${data.distance} km, ${data.calories} calories.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error syncing health data:', error);
      Alert.alert('Error', 'Failed to sync health data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Sign In Required</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Please sign in to manage your health connections.
          </Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]} 
            onPress={() => router.push('/(auth)/sign-in' as any)}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Health Connections</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Connect to health services to automatically track your daily activities.
        </Text>

        {healthKitStatus.isSimulator && (
          <View style={[styles.simulatorWarning, { backgroundColor: theme.colors.warning + '30' }]}>
            <Ionicons name="warning" size={20} color={theme.colors.warning} style={styles.warningIcon} />
            <Text style={[styles.warningText, { color: theme.colors.textPrimary }]}>
              Running on simulator. HealthKit functionality is limited on simulators.
              For full functionality, please test on a physical device.
            </Text>
          </View>
        )}

        {Platform.OS === 'ios' && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="heart" size={24} color="#FF2D55" />
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Apple Health</Text>
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Switch
                  value={healthKitStatus.isAuthorized}
                  onValueChange={handleConnectHealthKit}
                  disabled={(!healthKitStatus.isAvailable && !healthKitStatus.isSimulator) || refreshing}
                />
              )}
            </View>
            
            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Available:</Text>
                <Text style={[styles.statusValue, { color: theme.colors.textPrimary }]}>
                  {healthKitStatus.isSimulator ? 'Limited (Simulator)' : healthKitStatus.isAvailable ? 'Yes' : 'No'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Authorized:</Text>
                <Text style={[styles.statusValue, { color: theme.colors.textPrimary }]}>
                  {healthKitStatus.isAuthorized ? 'Yes' : 'No'}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Connected:</Text>
                <Text style={[styles.statusValue, { color: theme.colors.textPrimary }]}>
                  {healthKitStatus.isConnected ? 'Yes' : 'No'}
                </Text>
              </View>
              
              {healthKitStatus.lastSynced && (
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Last Synced:</Text>
                  <Text style={[styles.statusValue, { color: theme.colors.textPrimary }]}>
                    {new Date(healthKitStatus.lastSynced).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
            
            {(healthKitStatus.isAuthorized || healthKitStatus.isSimulator) && (
              <TouchableOpacity 
                style={[styles.syncButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSyncNow}
                disabled={refreshing}
              >
                <Ionicons name="sync" size={16} color="white" style={styles.syncIcon} />
                <Text style={styles.syncText}>Sync Now</Text>
              </TouchableOpacity>
            )}
            
            <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
              Connect to Apple Health to automatically track your steps, distance, and calories burned.
              {healthKitStatus.isSimulator ? ' Note: Full functionality requires a physical device.' : ''}
            </Text>
          </Card>
        )}

        {Platform.OS === 'android' && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="fitness" size={24} color="#4CAF50" />
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Google Fit</Text>
              <Text style={[styles.comingSoon, { color: theme.colors.textSecondary }]}>Coming Soon</Text>
            </View>
            <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
              Google Fit integration will be available in a future update.
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    marginTop: 12,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
  },
  statusValue: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  syncIcon: {
    marginRight: 8,
  },
  syncText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  comingSoon: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  simulatorWarning: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    flex: 1,
  },
}); 