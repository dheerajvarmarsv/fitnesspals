import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import { useUser } from './UserContext';
import {
  FitnessDataSource,
  FitnessConnection,
  getUserFitnessConnections,
  saveFitnessConnection,
  disconnectFitnessSource,
  updateSyncStatus,
} from '../lib/fitness';

// Demo mode for testing (should be false in production)
const DEMO_MODE = true;

interface FitnessConnectionsProps {
  onUpdate?: () => void;
}

export default function FitnessConnections({ onUpdate }: FitnessConnectionsProps) {
  const { user } = useUser();
  const [connections, setConnections] = useState<FitnessConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSource, setSyncingSource] = useState<FitnessDataSource | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadConnections();
    }
  }, [user?.id]);

  async function loadConnections() {
    try {
      setLoading(true);
      
      // Create demo fitness connections in memory (since the migration may not be applied)
      if (DEMO_MODE) {
        console.log('Using DEMO_MODE for fitness connections');
        // Create demo connections with generated UUIDs
        const generateId = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        // Create demo connections
        const demoConnections: FitnessConnection[] = [
          { 
            id: generateId(),
            user_id: user.id,
            type: 'google_fit', 
            connected: false, 
            status: 'disconnected',
            permissions: [],
            last_synced: null,
            last_sync_status: null,
            last_sync_error: null,
            last_sync_count: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: generateId(),
            user_id: user.id,
            type: 'apple_health', 
            connected: false, 
            status: 'disconnected',
            permissions: [],
            last_synced: null,
            last_sync_status: null,
            last_sync_error: null,
            last_sync_count: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: generateId(),
            user_id: user.id,
            type: 'fitbit', 
            connected: false, 
            status: 'disconnected',
            permissions: [],
            last_synced: null,
            last_sync_status: null,
            last_sync_error: null,
            last_sync_count: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
        ];
        
        // Only include platform-specific defaults
        const platformDemoConnections = Platform.OS === 'ios' 
          ? demoConnections.filter(c => c.type !== 'google_fit')
          : demoConnections.filter(c => c.type !== 'apple_health');
        
        setConnections(platformDemoConnections);
        setLoading(false);
        return;
      }
      
      // If not in demo mode, try to load real connections from database
      try {
        const data = await getUserFitnessConnections(user.id);
        
        // If no connections exist yet, create defaults
        if (data.length === 0) {
          const defaultConnections: Partial<FitnessConnection>[] = [
            { type: 'google_fit', connected: false, status: 'disconnected' },
            { type: 'apple_health', connected: false, status: 'disconnected' },
            { type: 'fitbit', connected: false, status: 'disconnected' },
          ];
          
          // Only include platform-specific defaults
          const platformDefaults = Platform.OS === 'ios' 
            ? defaultConnections.filter(c => c.type !== 'google_fit')
            : defaultConnections.filter(c => c.type !== 'apple_health');
          
          // Create default connections
          for (const conn of platformDefaults) {
            await saveFitnessConnection(user.id, conn);
          }
          
          // Reload connections
          const updatedData = await getUserFitnessConnections(user.id);
          setConnections(updatedData);
        } else {
          setConnections(data);
        }
      } catch (err) {
        console.error('Database error loading fitness connections:', err);
        
        // Fall back to demo mode if database fails
        Alert.alert(
          'Using Demo Mode', 
          'Could not connect to database. Using demo mode instead.',
          [{ text: 'OK' }]
        );
        
        // Create demo connections with generated UUIDs
        const generateId = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        // Create demo connections
        const demoConnections: FitnessConnection[] = [
          { 
            id: generateId(),
            user_id: user.id,
            type: 'google_fit', 
            connected: false, 
            status: 'disconnected',
            permissions: [],
            last_synced: null,
            last_sync_status: null,
            last_sync_error: null,
            last_sync_count: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: generateId(),
            user_id: user.id,
            type: 'apple_health', 
            connected: false, 
            status: 'disconnected',
            permissions: [],
            last_synced: null,
            last_sync_status: null,
            last_sync_error: null,
            last_sync_count: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: generateId(),
            user_id: user.id,
            type: 'fitbit', 
            connected: false, 
            status: 'disconnected',
            permissions: [],
            last_synced: null,
            last_sync_status: null,
            last_sync_error: null,
            last_sync_count: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
        ];
        
        // Only include platform-specific defaults
        const platformDemoConnections = Platform.OS === 'ios' 
          ? demoConnections.filter(c => c.type !== 'google_fit')
          : demoConnections.filter(c => c.type !== 'apple_health');
        
        setConnections(platformDemoConnections);
      }
    } catch (err) {
      console.error('Unexpected error loading fitness connections:', err);
      Alert.alert('Error', 'Failed to load fitness connections');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(source: FitnessDataSource) {
    // In a real app, this would initiate OAuth flow
    // For demo purposes, we'll simulate successful connection
    if (DEMO_MODE) {
      try {
        setSyncingSource(source);
        
        // Update connection to pending
        await saveFitnessConnection(user.id, {
          type: source,
          connected: false,
          status: 'pending',
        });
        
        // Simulate OAuth authentication delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update connection to connected
        await saveFitnessConnection(user.id, {
          type: source,
          connected: true,
          status: 'connected',
          permissions: ['activity', 'profile'],
        });
        
        // Simulate data sync
        await demoSyncData(source);
        
        // Reload connections
        await loadConnections();
        
        // Call onUpdate callback if provided
        if (onUpdate) onUpdate();
        
        // Show success message
        Alert.alert(
          'Connected!',
          `Your ${getSourceDisplayName(source)} account has been connected successfully.`
        );
      } catch (err) {
        console.error(`Error connecting to ${source}:`, err);
        Alert.alert('Connection Error', `Failed to connect to ${getSourceDisplayName(source)}`);
      } finally {
        setSyncingSource(null);
      }
      return;
    }
    
    // Real implementation would use OAuth
    try {
      // Example for OAuth flow
      const redirectUri = `${Constants.expoConfig?.scheme}://fitness-callback`;
      let authUrl = '';
      
      // Construct OAuth URL based on provider
      switch (source) {
        case 'google_fit':
          authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/fitness.activity.read`;
          break;
        case 'fitbit':
          authUrl = `https://www.fitbit.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=${redirectUri}&scope=activity`;
          break;
        default:
          throw new Error(`OAuth not supported for ${source}`);
      }
      
      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success') {
        // Extract authorization code from URL
        const code = result.url.includes('code=') 
          ? result.url.split('code=')[1].split('&')[0]
          : null;
          
        if (code) {
          // Exchange code for token (would be done on your backend)
          // For demo purposes, we'll just update the connection
          await saveFitnessConnection(user.id, {
            type: source,
            connected: true,
            status: 'connected',
            permissions: ['activity', 'profile'],
          });
          
          await loadConnections();
          if (onUpdate) onUpdate();
        }
      }
    } catch (err) {
      console.error(`Error connecting to ${source}:`, err);
      Alert.alert('Connection Error', `Failed to connect to ${getSourceDisplayName(source)}`);
    }
  }

  async function handleDisconnect(source: FitnessDataSource) {
    Alert.alert(
      'Disconnect Fitness Service',
      `Are you sure you want to disconnect your ${getSourceDisplayName(source)} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectFitnessSource(user.id, source);
              await loadConnections();
              if (onUpdate) onUpdate();
            } catch (err) {
              console.error(`Error disconnecting from ${source}:`, err);
              Alert.alert('Error', `Failed to disconnect from ${getSourceDisplayName(source)}`);
            }
          }
        }
      ]
    );
  }

  async function handleSync(source: FitnessDataSource, connection: FitnessConnection) {
    if (DEMO_MODE) {
      try {
        setSyncingSource(source);
        await demoSyncData(source);
        await loadConnections();
        if (onUpdate) onUpdate();
      } catch (err) {
        console.error(`Error syncing with ${source}:`, err);
        Alert.alert('Sync Error', `Failed to sync data from ${getSourceDisplayName(source)}`);
      } finally {
        setSyncingSource(null);
      }
      return;
    }
    
    // Real implementation would call your API to initiate sync
    try {
      setSyncingSource(source);
      
      // Update sync status
      await updateSyncStatus(connection.id, 'syncing');
      
      // TODO: Call your backend API to initiate sync
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update sync status
      await updateSyncStatus(connection.id, 'success', null, 10);
      
      await loadConnections();
      if (onUpdate) onUpdate();
      
      Alert.alert(
        'Sync Complete',
        `Your ${getSourceDisplayName(source)} data has been synced successfully.`
      );
    } catch (err) {
      console.error(`Error syncing with ${source}:`, err);
      
      // Update sync status with error
      await updateSyncStatus(
        connection.id, 
        'error', 
        err instanceof Error ? err.message : 'Unknown error'
      );
      
      Alert.alert('Sync Error', `Failed to sync data from ${getSourceDisplayName(source)}`);
    } finally {
      setSyncingSource(null);
    }
  }

  // Demo function to simulate data syncing
  async function demoSyncData(source: FitnessDataSource) {
    try {
      // Find the connection
      const connection = connections.find(c => c.type === source);
      if (!connection) return;
      
      // Update sync status
      await updateSyncStatus(connection.id, 'syncing');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Example successful sync - In a real app, you'd process data from the fitness API
      await updateSyncStatus(connection.id, 'success', null, 15);
      
      return true;
    } catch (err) {
      console.error(`Demo sync error for ${source}:`, err);
      
      // Find the connection
      const connection = connections.find(c => c.type === source);
      if (connection) {
        await updateSyncStatus(
          connection.id, 
          'error', 
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
      
      throw err;
    }
  }

  function getSourceDisplayName(source: FitnessDataSource): string {
    switch (source) {
      case 'google_fit': return 'Google Fit';
      case 'apple_health': return 'Apple Health';
      case 'fitbit': return 'Fitbit';
      case 'manual': return 'Manual Entry';
      case 'other': return 'Other Source';
      default: return source;
    }
  }

  function getSourceIcon(source: FitnessDataSource): string {
    switch (source) {
      case 'google_fit': return 'logo-google';
      case 'apple_health': return 'logo-apple';
      case 'fitbit': return 'fitness';
      case 'manual': return 'create-outline';
      case 'other': return 'link-outline';
      default: return 'help-circle-outline';
    }
  }

  function formatLastSynced(timestamp: string | null): string {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString();
  }

  // Filter connections based on platform
  const filteredConnections = connections.filter(conn => {
    if (Platform.OS === 'ios') {
      return conn.type !== 'google_fit';
    } else {
      return conn.type !== 'apple_health';
    }
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading fitness connections...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Connect Fitness Services</Text>
      <Text style={styles.subtitle}>
        Connect your fitness apps to automatically import your activities.
      </Text>
      
      {filteredConnections.map(connection => (
        <View key={connection.id} style={styles.connectionCard}>
          <View style={styles.connectionHeader}>
            <View style={styles.sourceIconContainer}>
              <Ionicons 
                name={getSourceIcon(connection.type as FitnessDataSource)} 
                size={24} 
                color="#fff" 
              />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>
                {getSourceDisplayName(connection.type as FitnessDataSource)}
              </Text>
              <Text style={[
                styles.connectionStatus,
                connection.connected ? styles.connectedStatus : styles.disconnectedStatus
              ]}>
                {connection.connected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
          
          {connection.connected && (
            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>
                Last synced: {formatLastSynced(connection.last_synced)}
              </Text>
              {connection.last_sync_count !== null && (
                <Text style={styles.syncCount}>
                  {connection.last_sync_count} activities
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            {connection.connected ? (
              <>
                <TouchableOpacity 
                  style={[styles.button, styles.syncButton]}
                  onPress={() => handleSync(connection.type as FitnessDataSource, connection)}
                  disabled={syncingSource === connection.type}
                >
                  {syncingSource === connection.type ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sync" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.disconnectButton]}
                  onPress={() => handleDisconnect(connection.type as FitnessDataSource)}
                  disabled={syncingSource === connection.type}
                >
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.connectButton]}
                onPress={() => handleConnect(connection.type as FitnessDataSource)}
                disabled={syncingSource === connection.type}
              >
                {syncingSource === connection.type ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="link" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Connect</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      
      <View style={styles.notesContainer}>
        <Text style={styles.notesTitle}>Why connect fitness apps?</Text>
        <Text style={styles.notesText}>
          • Automatically sync your workouts and activities
        </Text>
        <Text style={styles.notesText}>
          • Earn points in challenges without manual entry
        </Text>
        <Text style={styles.notesText}>
          • Keep your activity history in one place
        </Text>
        <Text style={styles.notesText}>
          • Track your progress across multiple services
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  connectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  connectionStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  connectedStatus: {
    color: '#4CAF50',
  },
  disconnectedStatus: {
    color: '#9E9E9E',
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  syncLabel: {
    fontSize: 14,
    color: '#666',
  },
  syncCount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  connectButton: {
    backgroundColor: '#4A90E2',
  },
  syncButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  notesContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});