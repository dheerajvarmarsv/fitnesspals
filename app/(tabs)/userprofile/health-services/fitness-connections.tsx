import React, { useEffect, useState } from 'react';
import { View, Platform, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, Linking } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { 
  saveFitnessConnection, 
  FitnessDataSource, 
  initHealthKit,
  initAndroidHealth,
  fetchAndStoreDailyHealthData,
  checkHealthPermissions
} from '../../../../lib/fitness';
import { useUser } from '../../../../components/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function HealthServicesScreen() {
  const { user } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    if (user?.id) {
      initializeHealthServices();
      checkConnection();
      checkPermissionStatus();
    }
  }, [user]);

  // Add periodic permission check
  useEffect(() => {
    if (isConnected) {
      const checkInterval = setInterval(checkPermissionStatus, 30000); // Check every 30 seconds
      return () => clearInterval(checkInterval);
    }
  }, [isConnected]);

  const checkPermissionStatus = async () => {
    const hasPerms = await checkHealthPermissions();
    setHasPermissions(hasPerms);
    
    // If permissions were revoked while connected, disconnect
    if (!hasPerms && isConnected) {
      await handleDisconnect();
      Alert.alert(
        'Health Permissions Revoked',
        'Please re-enable health permissions in your device settings to continue tracking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Platform.OS === 'ios' 
              ? Linking.openURL('app-settings:')
              : Linking.openSettings()
          }
        ]
      );
    }
  };

  const initializeHealthServices = async () => {
    if (!user?.id) return;

    try {
      let initialized = false;
      if (Platform.OS === 'ios') {
        initialized = await initHealthKit();
      } else if (Platform.OS === 'android') {
        initialized = await initAndroidHealth();
      }

      setIsInitialized(initialized);
      if (!initialized) {
        Alert.alert(
          'Health Services Error',
          `Failed to initialize ${Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}. Please ensure the app has necessary permissions.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Platform.OS === 'ios' 
                ? Linking.openURL('app-settings:')
                : Linking.openSettings()
            }
          ]
        );
      } else {
        // Check permissions after initialization
        await checkPermissionStatus();
      }
    } catch (error) {
      console.error('[Health] Error initializing health services:', error);
      setIsInitialized(false);
    }
  };

  const checkConnection = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_fitness_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', Platform.OS === 'ios' ? 'apple_health' : 'google_fit')
        .eq('connected', true)
        .single();

      if (error) {
        console.error('[Health] Error checking connection:', error);
        return;
      }

      setIsConnected(!!data);
    } catch (error) {
      console.error('[Health] Exception checking connection:', error);
    }
  };

  const handleConnect = async () => {
    if (!user?.id) {
      console.error('[Health] User not authenticated');
      return;
    }

    if (!isInitialized) {
      Alert.alert(
        'Health Services Not Available',
        'Please ensure health services are properly initialized and try again.'
      );
      return;
    }

    setIsConnecting(true);
    try {
      const source: FitnessDataSource = Platform.OS === 'ios' ? 'apple_health' : 'google_fit';
      const success = await saveFitnessConnection(user.id, {
        type: source,
        connected: true,
        status: 'connected',
        permissions: []
      });
      
      if (success) {
        // Fetch initial health data
        await fetchAndStoreDailyHealthData(user.id, new Date());
        setIsConnected(true);
        await checkConnection();
      }
    } catch (error) {
      console.error('[Health] Error connecting to health services:', error);
      Alert.alert(
        'Connection Error',
        'Failed to connect to health services. Please try again.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_fitness_connections')
        .update({ 
          connected: false,
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('type', Platform.OS === 'ios' ? 'apple_health' : 'google_fit');

      if (error) {
        console.error('[Health] Error disconnecting:', error);
        Alert.alert(
          'Disconnection Error',
          'Failed to disconnect from health services. Please try again.'
        );
        return;
      }

      setIsConnected(false);
    } catch (error) {
      console.error('[Health] Exception disconnecting:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while disconnecting. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons 
            name="heart" 
            size={24} 
            color={isConnected && hasPermissions ? '#4CAF50' : '#757575'} 
          />
          <Text style={styles.title}>
            {Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}
          </Text>
        </View>

        <Text style={styles.description}>
          Connect to {Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'} to track your daily activity and progress.
        </Text>

        {!isInitialized && (
          <Text style={styles.warning}>
            Health services are not available. Please check your device settings.
          </Text>
        )}

        {isInitialized && !hasPermissions && (
          <Text style={styles.warning}>
            Health permissions are required. Please grant permissions in your device settings.
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            isConnected ? styles.disconnectButton : styles.connectButton,
            (!isInitialized || !hasPermissions) && styles.disabledButton
          ]}
          onPress={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting || !isInitialized || !hasPermissions}
        >
          {isConnecting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          )}
        </TouchableOpacity>

        {(!isInitialized || !hasPermissions) && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Platform.OS === 'ios' 
              ? Linking.openURL('app-settings:')
              : Linking.openSettings()
            }
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#212121',
  },
  description: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
    lineHeight: 20,
  },
  warning: {
    fontSize: 14,
    color: '#f44336',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
}); 