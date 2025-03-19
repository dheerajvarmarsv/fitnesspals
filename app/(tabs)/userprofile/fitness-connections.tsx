import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { supabase } from '../../../lib/supabase';
import { getUserFitnessConnections, saveFitnessConnection, disconnectFitnessSource } from '../../../lib/fitness';

export default function FitnessConnections({ onUpdate }: { onUpdate?: () => void }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [healthConnectConnected, setHealthConnectConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        loadConnections(data.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadConnections = async (uid: string) => {
    try {
      setLoading(true);
      const connections = await getUserFitnessConnections(uid);
      
      // Check if Apple Health is connected
      const appleHealth = connections.find(c => c.type === 'apple_health');
      setAppleHealthConnected(appleHealth?.connected || false);
      
      // Check if Health Connect is connected
      const healthConnect = connections.find(c => c.type === 'health_connect');
      setHealthConnectConnected(healthConnect?.connected || false);
    } catch (error) {
      console.error('Error loading connections:', error);
      Alert.alert('Error', 'Failed to load connection status');
    } finally {
      setLoading(false);
    }
  };

  const toggleAppleHealth = async (value: boolean) => {
    if (!userId) return;
    
    try {
      if (Platform.OS !== 'ios') {
        Alert.alert('Not Available', 'Apple Health is only available on iOS devices');
        return;
      }
      
      setLoading(true);
      
      if (value) {
        // Connect to Apple Health
        const { initHealthKit } = await import('../../../lib/fitness');
        const success = await initHealthKit();
        
        if (success) {
          await saveFitnessConnection(userId, {
            type: 'apple_health',
            connected: true,
            status: 'connected',
            permissions: ['Steps', 'Distance', 'Calories']
          });
          setAppleHealthConnected(true);
          Alert.alert('Success', 'Connected to Apple Health');
          if (onUpdate) onUpdate();
        } else {
          Alert.alert('Error', 'Failed to connect to Apple Health');
        }
      } else {
        // Disconnect from Apple Health
        await disconnectFitnessSource(userId, 'apple_health');
        setAppleHealthConnected(false);
        Alert.alert('Disconnected', 'Apple Health has been disconnected');
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error toggling Apple Health:', error);
      Alert.alert('Error', 'Failed to update connection');
    } finally {
      setLoading(false);
    }
  };

  const toggleHealthConnect = async (value: boolean) => {
    if (!userId) return;
    
    try {
      if (Platform.OS !== 'android') {
        Alert.alert('Not Available', 'Health Connect is only available on Android devices');
        return;
      }
      
      setLoading(true);
      
      if (value) {
        // Connect to Health Connect
        const { initAndroidHealth } = await import('../../../lib/fitness');
        const success = await initAndroidHealth();
        
        if (success) {
          await saveFitnessConnection(userId, {
            type: 'health_connect',
            connected: true,
            status: 'connected',
            permissions: ['Steps', 'Distance', 'Calories']
          });
          setHealthConnectConnected(true);
          Alert.alert('Success', 'Connected to Health Connect');
          if (onUpdate) onUpdate();
        } else {
          Alert.alert('Error', 'Failed to connect to Health Connect');
        }
      } else {
        // Disconnect from Health Connect
        await disconnectFitnessSource(userId, 'health_connect');
        setHealthConnectConnected(false);
        Alert.alert('Disconnected', 'Health Connect has been disconnected');
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error toggling Health Connect:', error);
      Alert.alert('Error', 'Failed to update connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Fitness Connections</Text>
        <Text style={styles.description}>
          Connect your fitness apps to automatically sync your activities
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#00000" style={styles.loader} />
        ) : (
          <View style={styles.connectionsContainer}>
            {Platform.OS === 'ios' && (
              <View style={styles.connectionItem}>
                <View style={styles.connectionInfo}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0F7FA' }]}>
                    <Ionicons name="fitness" size={24} color="#00B0FF" />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.connectionName}>Apple Health</Text>
                    <Text style={styles.connectionDescription}>
                      Sync steps, workouts, and other health data
                    </Text>
                  </View>
                </View>
                <Switch
                  value={appleHealthConnected}
                  onValueChange={toggleAppleHealth}
                  trackColor={{ false: '#ddd', true: '#4caf50' }}
                  thumbColor="#fff"
                  disabled={loading}
                />
              </View>
            )}

            {Platform.OS === 'android' && (
              <View style={styles.connectionItem}>
                <View style={styles.connectionInfo}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="fitness" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.connectionName}>Health Connect</Text>
                    <Text style={styles.connectionDescription}>
                      Sync steps, workouts, and other health data
                    </Text>
                  </View>
                </View>
                <Switch
                  value={healthConnectConnected}
                  onValueChange={toggleHealthConnect}
                  trackColor={{ false: '#ddd', true: '#4caf50' }}
                  thumbColor="#fff"
                  disabled={loading}
                />
              </View>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#555" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Connecting to health services allows the app to read your activity data for challenges and stats. Your data is never shared without your permission.
              </Text>
            </View>
          </View>
        )}
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  loader: {
    marginTop: 40,
  },
  connectionsContainer: {
    gap: 16,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  connectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
});