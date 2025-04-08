import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';
import {
  isHealthKitAvailable,
  getHealthKitStatus,
  initHealthKit,
  disableHealthKit,
  syncHealthData,
  setupBackgroundObservers,
  getLastSyncTime
} from '../../../lib/healthKit';

export default function FitnessConnections() {
  const { settings, user } = useUser();
  const [healthKitStatus, setHealthKitStatus] = useState({ 
    isAvailable: false,
    isAuthorized: false,
    permissions: { 
      steps: false, 
      calories: false,
      distance: false,
      heartRate: false,
      sleep: false
    }
  });
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Check availability and last sync time on component mount
  useEffect(() => {
    checkAvailability();
    loadLastSyncTime();
  }, []);

  const loadLastSyncTime = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const checkAvailability = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      
      const available = await isHealthKitAvailable();
      console.log("HealthKit available:", available);
      
      if (available) {
        await checkHealthKitStatus();
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error checking HealthKit availability:", error);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(error.message || 'Failed to check availability');
    }
  };

  const checkHealthKitStatus = async () => {
    try {
      const status = await getHealthKitStatus();
      console.log("HealthKit status:", status);
      setHealthKitStatus(status);
      setHealthKitEnabled(status.isAuthorized);
    } catch (error: any) {
      console.error('Error checking HealthKit status:', error);
      setHasError(true);
      setErrorMessage(error.message || 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to sync health data.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await syncHealthData(user.id, today);
      await loadLastSyncTime();
      Alert.alert("Success", "Your health data has been synced successfully.");
    } catch (error: any) {
      console.error("Error syncing data:", error);
      Alert.alert("Error", error.message || "There was a problem syncing your health data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const openHealthSettings = () => {
    // This will open the Health app on iOS
    Linking.openURL('x-apple-health://');
    
    // Alternatively, can open the app settings
    // Linking.openURL('app-settings:');
  };

  const handleHealthKitToggle = async (value: boolean) => {
    try {
      const available = await isHealthKitAvailable();
      if (!available) {
        Alert.alert('Not Available', 'HealthKit is not available on this device.');
        return;
      }

      if (value) {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage('');
        
        console.log("Initializing HealthKit...");
        const success = await initHealthKit();
        console.log("HealthKit initialization result:", success);
        
        if (success) {
          if (user?.id) {
            console.log("Setting up background observers...");
            setupBackgroundObservers(user.id);
            
            console.log("Syncing health data...");
            const today = new Date().toISOString().split('T')[0];
            await syncHealthData(user.id, today);
            await loadLastSyncTime();
          }
          
          await checkHealthKitStatus();
          Alert.alert(
            "Success",
            "Health data access has been enabled. Your activity data will now sync automatically."
          );
        } else {
          Alert.alert(
            "Permission Denied",
            "You need to allow access to health data in order to sync activities.",
            [
              { 
                text: "Open Health Settings", 
                onPress: openHealthSettings 
              },
              { text: "OK" }
            ]
          );
        }
      } else {
        await disableHealthKit();
        await checkHealthKitStatus();
        Alert.alert(
          "Health Data Disabled",
          "Health data syncing has been disabled. Your activity data will no longer sync automatically."
        );
      }
    } catch (error: any) {
      console.error("Error toggling HealthKit:", error);
      setHasError(true);
      setErrorMessage(error.message || 'Connection error');
      Alert.alert(
        "Error",
        "There was a problem setting up the health data connection. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPermissionItem = (
    title: string, 
    permission: boolean, 
    icon: string
  ) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionLeft}>
        <MaterialCommunityIcons 
          name={icon as any} 
          size={24} 
          color="#666"
          style={styles.permissionIcon}
        />
        <Text style={styles.permissionText}>{title}</Text>
      </View>
      <Ionicons 
        name={permission ? "checkmark-circle" : "close-circle"} 
        size={22} 
        color={permission ? "#4CAF50" : "#F44336"} 
      />
    </View>
  );

  return (
    <SharedLayout style={styles.container as any}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Health Tracking</Text>
        <Text style={styles.description}>
          Connect to your device's health services to automatically track your activities.
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Checking health services...</Text>
          </View>
        ) : (
          <>
            {Platform.OS === 'ios' && (
              <View style={styles.card}>
                <View style={styles.connectionRow}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="apple" size={24} color="#000" />
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.cardTitle}>Apple Health</Text>
                    <Text style={styles.cardDescription}>
                      {hasError 
                        ? `Connection error: ${errorMessage}` 
                        : "Sync your health and fitness data with Apple Health"}
                    </Text>
                    {lastSync && healthKitEnabled && (
                      <Text style={styles.lastSyncText}>
                        Last synced: {new Date(lastSync).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  
                  {hasError ? (
                    <View style={styles.errorActions}>
                      <TouchableOpacity 
                        style={styles.retryButton} 
                        onPress={checkAvailability}
                      >
                        <Text style={styles.retryText}>Retry</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.settingsButton} 
                        onPress={openHealthSettings}
                      >
                        <Text style={styles.settingsText}>Settings</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Switch
                      value={healthKitEnabled}
                      onValueChange={handleHealthKitToggle}
                      trackColor={{ false: "#d1d1d1", true: "#81b0ff" }}
                      thumbColor={healthKitEnabled ? "#2196F3" : "#f4f3f4"}
                    />
                  )}
                </View>

                {healthKitEnabled && !hasError && (
                  <View style={styles.permissionsContainer}>
                    {renderPermissionItem('Steps', healthKitStatus.permissions.steps, 'walk')}
                    {renderPermissionItem('Calories', healthKitStatus.permissions.calories, 'fire')}
                    {renderPermissionItem('Distance', healthKitStatus.permissions.distance, 'map-marker-distance')}
                    {renderPermissionItem('Heart Rate', healthKitStatus.permissions.heartRate, 'heart-pulse')}
                    {renderPermissionItem('Sleep', healthKitStatus.permissions.sleep, 'sleep')}
                    
                    <TouchableOpacity 
                      style={[
                        styles.syncButton,
                        isSyncing && styles.syncButtonDisabled
                      ]} 
                      onPress={handleManualSync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="sync" size={20} color="#fff" style={styles.syncIcon} />
                          <Text style={styles.syncButtonText}>Sync Now</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {Platform.OS === 'android' && (
              <View style={styles.card}>
                <View style={styles.connectionRow}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="google" size={24} color="#4285F4" />
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.cardTitle}>Google Fit</Text>
                    <Text style={styles.cardDescription}>
                      Google Fit integration is coming soon
                    </Text>
                  </View>
                  <View style={styles.comingSoonTag}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorActions: {
    flexDirection: 'column',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  settingsText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIcon: {
    marginRight: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
  },
  syncButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncIcon: {
    marginRight: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  comingSoonText: {
    color: '#666',
    fontSize: 12,
  },
});