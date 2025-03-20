// components/FitnessConnections.tsx

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import {
  FitnessDataSource,
  ConnectionStatus,
  FitnessConnection,
  getUserFitnessConnections,
  saveFitnessConnection,
  disconnectFitnessSource,
  initHealthKit,
  initAndroidHealth,
  fetchAndStoreDailyHealthData,
} from '../lib/fitness';

interface FitnessConnectionsProps {
  onUpdate?: () => void;
}

export default function FitnessConnections({ onUpdate }: FitnessConnectionsProps) {
  const [connections, setConnections] = useState<FitnessConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current user and load connections
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
      const dbConnections = await getUserFitnessConnections(uid);
      let connectionList = [...dbConnections];

      // Ensure placeholders for Apple Health (iOS) and Health Connect (Android) exist
      const hasAppleHealth = connectionList.some((c) => c.type === 'apple_health');
      const hasHealthConnect = connectionList.some((c) => c.type === 'health_connect');

      if (Platform.OS === 'ios' && !hasAppleHealth) {
        connectionList.push({
          id: 'apple_health',
          user_id: uid,
          type: 'apple_health',
          connected: false,
          status: 'disconnected' as ConnectionStatus,
          permissions: [],
          last_synced: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as FitnessConnection);
      }

      if (Platform.OS === 'android' && !hasHealthConnect) {
        connectionList.push({
          id: 'health_connect',
          user_id: uid,
          type: 'health_connect',
          connected: false,
          status: 'disconnected' as ConnectionStatus,
          permissions: [],
          last_synced: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as FitnessConnection);
      }

      setConnections(connectionList);
    } catch (error) {
      console.error('Error loading connections:', error);
      Alert.alert('Error', 'Failed to load fitness connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (source: FitnessDataSource) => {
    if (!userId) return;
    try {
      setLoading(true);
      let success = false;

      if (source === 'apple_health' && Platform.OS === 'ios') {
        // Connect to Apple Health
        success = await initHealthKit();
        if (success) {
          await saveFitnessConnection(userId, {
            type: 'apple_health',
            connected: true,
            status: 'connected',
            permissions: ['Steps', 'Distance', 'Calories'],
          });
        }
      } else if (source === 'health_connect' && Platform.OS === 'android') {
        // Connect to Health Connect
        success = await initAndroidHealth();
        if (success) {
          await saveFitnessConnection(userId, {
            type: 'health_connect',
            connected: true,
            status: 'connected',
            permissions: ['Steps', 'Distance', 'ActiveCaloriesBurned', 'ExerciseSession'],
          });
        }
      } else {
        Alert.alert('Not Supported', `Connecting "${source}" is not implemented on this device.`);
        return;
      }

      if (success) {
        // Immediately fetch today's health data
        await fetchAndStoreDailyHealthData(userId, new Date());
        // Reload connections and notify parent
        await loadConnections(userId);
        if (onUpdate) onUpdate();
        Alert.alert(
          'Success',
          `Connected to ${
            source === 'apple_health' ? 'Apple Health' : 'Health Connect'
          } successfully.`
        );
      } else {
        Alert.alert(
          'Connection Failed',
          `Unable to connect to ${
            source === 'apple_health' ? 'Apple Health' : 'Health Connect'
          }. Check your device permissions.`
        );
      }
    } catch (error) {
      console.error(`Error connecting to ${source}:`, error);
      Alert.alert('Connection Error', `Failed to connect to ${source}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (source: FitnessDataSource) => {
    if (!userId) return;
    try {
      setLoading(true);
      await disconnectFitnessSource(userId, source);
      await loadConnections(userId);
      if (onUpdate) onUpdate();
      Alert.alert('Disconnected', `Successfully disconnected from ${source}.`);
    } catch (error) {
      console.error(`Error disconnecting from ${source}:`, error);
      Alert.alert('Disconnect Error', `Failed to disconnect from ${source}.`);
    } finally {
      setLoading(false);
    }
  };

  // Filter connections: show Apple Health on iOS, Health Connect on Android
  const filteredConnections = connections.filter((conn) => {
    if (Platform.OS === 'ios') {
      return conn.type === 'apple_health';
    }
    if (Platform.OS === 'android') {
      return conn.type === 'health_connect';
    }
    return false;
  });

  if (loading && connections.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading fitness connections...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Connected Services</Text>
      <Text style={styles.description}>
        Connect your fitness services to sync your activities and health data.
      </Text>

      {filteredConnections.map((connection) => {
        const isApple = connection.type === 'apple_health';
        const isHealthConnect = connection.type === 'health_connect';
        const title = isApple
          ? 'Apple Health'
          : isHealthConnect
          ? 'Health Connect'
          : connection.type.charAt(0).toUpperCase() + connection.type.slice(1);
        const iconName = isApple ? 'heart' : isHealthConnect ? 'fitness' : 'sync';
        const isConnected = !!connection.connected;
        const lastSynced = connection.last_synced
          ? new Date(connection.last_synced).toLocaleString()
          : 'Never';

        return (
          <View key={connection.id || connection.type} style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <View style={styles.connectionInfo}>
                <View
                  style={[
                    styles.iconContainer,
                    isConnected ? styles.connectedIcon : styles.disconnectedIcon,
                  ]}
                >
                  <Ionicons name={iconName as any} size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.connectionTitle}>{title}</Text>
                  <Text style={styles.connectionStatus}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, isConnected ? styles.disconnectButton : styles.connectButton]}
                onPress={() =>
                  isConnected
                    ? handleDisconnect(connection.type)
                    : handleConnect(connection.type)
                }
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
            {isConnected && (
              <View style={styles.connectionDetails}>
                <Text style={styles.detailLabel}>Last synced:</Text>
                <Text style={styles.detailValue}>{lastSynced}</Text>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
        <Text style={styles.infoText}>
          Connecting to Apple Health (on iOS) or Health Connect (on Android) lets the app read your daily
          activity data such as steps, distance, and calories. Your data remains private and is used solely
          to track your progress.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  connectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectedIcon: {
    backgroundColor: '#4CAF50',
  },
  disconnectedIcon: {
    backgroundColor: '#9E9E9E',
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#000000',
  },
  disconnectButton: {
    backgroundColor: '#FF4B4B',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  connectionDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default FitnessConnections;