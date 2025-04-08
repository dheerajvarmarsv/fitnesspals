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
  Alert
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import SharedLayout from '../../../../components/SharedLayout';
import { useUser } from '../../../../components/UserContext';
import {
  isHealthKitAvailable,
  getHealthKitStatus,
  initHealthKit,
  disableHealthKit,
  syncHealthData,
  setupBackgroundObservers
} from '../../../../lib/healthKit';

export default function FitnessConnections() {
  const { settings, user } = useUser();
  const [healthKitStatus, setHealthKitStatus] = useState({ 
    isAvailable: false,
    isAuthorized: false,
    permissions: { steps: false, calories: false }
  });
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [permissionDeniedAlert, setPermissionDeniedAlert] = useState(false);

  // Check availability on component mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const available = isHealthKitAvailable();
      console.log("HealthKit available:", available);
      
      if (available) {
        await checkHealthKitStatus();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking HealthKit availability:", error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  const checkHealthKitStatus = async () => {
    try {
      const status = await getHealthKitStatus();
      console.log("HealthKit status:", status);
      setHealthKitStatus(status);
      setHealthKitEnabled(status.isAuthorized);
    } catch (error) {
      console.error('Error checking HealthKit status:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await syncHealthData(user.id, today);
      Alert.alert("Success", "Your health data has been synced successfully.");
    } catch (error) {
      console.error("Error syncing data:", error);
      Alert.alert("Error", "There was a problem syncing your health data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleHealthKitToggle = async (value: boolean) => {
    if (!isHealthKitAvailable()) {
      Alert.alert('Not Available', 'HealthKit is not available on this device.');
      return;
    }

    try {
      if (value) {
        setIsLoading(true);
        setHasError(false);
        
        console.log("Initializing HealthKit...");
        const success = await initHealthKit();
        console.log("HealthKit initialization result:", success);
        
        if (success) {
          if (user) {
            console.log("Setting up background observers...");
            setupBackgroundObservers(user.id);
            
            console.log("Syncing health data...");
            const today = new Date().toISOString().split('T')[0];
            await syncHealthData(user.id, today);
          }
          
          await checkHealthKitStatus();
          Alert.alert(
            "Success",
            "Health data access has been enabled. Your activity data will now sync automatically."
          );
        } else {
          setPermissionDeniedAlert(true);
        }
      } else {
        await disableHealthKit();
        await checkHealthKitStatus();
        Alert.alert(
          "Health Data Disabled",
          "Health data syncing has been disabled. Your activity data will no longer sync automatically."
        );
      }
    } catch (error) {
      console.error("Error toggling HealthKit:", error);
      setHasError(true);
      Alert.alert(
        "Error",
        "There was a problem setting up the health data connection. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    checkHealthKitStatus();
  };

  // Render error alert when permission is denied
  useEffect(() => {
    if (permissionDeniedAlert) {
      Alert.alert(
        "Permission Denied",
        "You need to allow access to health data in order to sync activities. Please go to your iPhone's Settings > Privacy > Health to grant access.",
        [
          { 
            text: "OK", 
            onPress: () => setPermissionDeniedAlert(false)
          }
        ]
      );
    }
  }, [permissionDeniedAlert]);

  return (
    <SharedLayout style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Health Tracking</Text>
        <Text style={styles.description}>
          Connect to your device's health services to automatically track your activities.
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00000" />
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
                        ? "There was a problem connecting to Apple Health" 
                        : "Sync steps, workouts, and calories with Apple Health"}
                    </Text>
                  </View>
                  
                  {hasError ? (
                    <TouchableOpacity 
                      style={styles.retryButton} 
                      onPress={handleRetry}
                    >
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
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
                    <View style={styles.permissionItem}>
                      <Text style={styles.permissionText}>Steps</Text>
                      <Ionicons 
                        name={healthKitStatus.permissions.steps ? "checkmark-circle" : "close-circle"} 
                        size={22} 
                        color={healthKitStatus.permissions.steps ? "#4CAF50" : "#F44336"} 
                      />
                    </View>
                    <View style={styles.permissionItem}>
                      <Text style={styles.permissionText}>Calories</Text>
                      <Ionicons 
                        name={healthKitStatus.permissions.calories ? "checkmark-circle" : "close-circle"} 
                        size={22} 
                        color={healthKitStatus.permissions.calories ? "#4CAF50" : "#F44336"} 
                      />
                    </View>
                    <TouchableOpacity 
                      style={styles.syncButton} 
                      onPress={handleManualSync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.syncButtonText}>Sync Now</Text>
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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manual Activity Tracking</Text>
              <Text style={styles.cardDescription}>
                You can always log your activities manually even if you don't connect to health services.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('/arena')}
              >
                <Text style={styles.buttonText}>Go to Activity Tracking</Text>
              </TouchableOpacity>
            </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  connectionInfo: {
    flex: 1,
  },
  permissionsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
  },
  syncButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  comingSoonTag: {
    backgroundColor: '#FFD54F',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5D4037',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
});