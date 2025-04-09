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
  Linking,
  Image
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import SharedLayout from '../../../../components/SharedLayout';
import { useUser } from '../../../../components/UserContext';
import {
  isHealthKitAvailable,
  getHealthKitStatus,
  initHealthKit,
  disableHealthKit,
  syncHealthData,
  setupBackgroundObservers,
  getLastSyncTime
} from '../../../../lib/healthKit';

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
    <SharedLayout style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#4A90E2', '#5C38ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <Text style={styles.title}>Health Services</Text>
            <Text style={styles.subtitle}>
              Connect to health services to automatically track your activities
            </Text>
          </LinearGradient>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Checking health services...</Text>
          </View>
        ) : (
          <>
            {Platform.OS === 'ios' ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Image 
                      source={{uri: 'https://developer.apple.com/design/human-interface-guidelines/macos/images/app-icon-realistic-materials_2x.png'}}
                      style={styles.platformIcon}
                    />
                  </View>
                  <View style={styles.cardHeaderTextContent}>
                    <Text style={styles.cardTitle}>Apple Health</Text>
                    <Text style={styles.cardSubtitle}>
                      Connect to Apple Health to automatically sync your health data
                    </Text>
                  </View>
                </View>
                
                {hasError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage || "Connection error"}</Text>
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
                  </View>
                ) : (
                  <View style={styles.connectionRow}>
                    <Text style={styles.connectionText}>
                      {healthKitEnabled ? 'Connected' : 'Not Connected'}
                    </Text>
                    <Switch
                      value={healthKitEnabled}
                      onValueChange={handleHealthKitToggle}
                      trackColor={{ false: "#d1d1d1", true: "#91c3fd" }}
                      thumbColor={healthKitEnabled ? "#4A90E2" : "#f4f3f4"}
                      ios_backgroundColor="#d1d1d1"
                    />
                  </View>
                )}

                {healthKitEnabled && !hasError && (
                  <>
                    <View style={styles.permissionsContainer}>
                      <Text style={styles.permissionsTitle}>Permissions</Text>
                      
                      {renderPermissionItem('Steps', healthKitStatus.permissions.steps, 'walk')}
                      {renderPermissionItem('Calories', healthKitStatus.permissions.calories, 'fire')}
                      {renderPermissionItem('Distance', healthKitStatus.permissions.distance, 'map-marker-distance')}
                      {renderPermissionItem('Heart Rate', healthKitStatus.permissions.heartRate, 'heart-pulse')}
                      {renderPermissionItem('Sleep', healthKitStatus.permissions.sleep, 'sleep')}
                    </View>
                    
                    <View style={styles.syncContainer}>
                      {lastSync && (
                        <Text style={styles.lastSyncText}>
                          Last sync: {new Date(lastSync).toLocaleString()}
                        </Text>
                      )}
                      
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
                            <Ionicons name="sync" size={16} color="#fff" style={styles.syncIcon} />
                            <Text style={styles.syncButtonText}>Sync Now</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                
                {healthKitEnabled && (
                  <View style={styles.infoContainer}>
                    <Ionicons name="information-circle" size={18} color="#4A90E2" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                      Your activities will sync automatically in the background. You can also sync manually at any time.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="google" size={24} color="#4285F4" />
                  </View>
                  <View style={styles.cardHeaderTextContent}>
                    <Text style={styles.cardTitle}>Google Fit</Text>
                    <Text style={styles.cardSubtitle}>
                      Connect to Google Fit to automatically sync your health data
                    </Text>
                  </View>
                </View>
                
                <View style={styles.comingSoonContainer}>
                  <LinearGradient
                    colors={['#FF9800', '#F57C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.comingSoonBadge}
                  >
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </LinearGradient>
                  <Text style={styles.comingSoonDescription}>
                    Google Fit integration will be available in the next update
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manual Activity Tracking</Text>
              <Text style={styles.cardDescription}>
                You can always manually track your activities in the app
              </Text>
              
              <View style={styles.manualTrackingInfoContainer}>
                <View style={styles.manualTrackingInfoItem}>
                  <View style={[styles.infoCircle, {backgroundColor: '#4CAF50'}]}>
                    <Ionicons name="add-circle" size={22} color="#fff" />
                  </View>
                  <Text style={styles.infoText}>Record workouts, steps, and activities</Text>
                </View>
                
                <View style={styles.manualTrackingInfoItem}>
                  <View style={[styles.infoCircle, {backgroundColor: '#2196F3'}]}>
                    <Ionicons name="trending-up" size={22} color="#fff" />
                  </View>
                  <Text style={styles.infoText}>Track your progress over time</Text>
                </View>
                
                <View style={styles.manualTrackingInfoItem}>
                  <View style={[styles.infoCircle, {backgroundColor: '#9C27B0'}]}>
                    <Ionicons name="trophy" size={22} color="#fff" />
                  </View>
                  <Text style={styles.infoText}>Compete in challenges with friends</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/')}
              >
                <LinearGradient
                  colors={['#4A90E2', '#5C38ED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionButtonText}>Go to Dashboard</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
        
        <View style={styles.bottomInfoContainer}>
          <Ionicons name="information-circle-outline" size={18} color="#666" style={{marginRight: 8}} />
          <Text style={styles.bottomInfoText}>
            Health data is securely stored and synced with your account. Your privacy is our priority.
          </Text>
        </View>
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8fa',
  },
  scrollContainer: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  platformIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  connectionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.2)',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 12,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  settingsButton: {
    backgroundColor: '#757575',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  settingsText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  permissionsContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
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
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  lastSyncText: {
    fontSize: 14,
    color: '#666',
  },
  syncButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncIcon: {
    marginRight: 6,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flex: 1,
  },
  comingSoonContainer: {
    alignItems: 'center',
    padding: 16,
  },
  comingSoonBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  comingSoonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  comingSoonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  manualTrackingInfoContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  manualTrackingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 8,
  },
  bottomInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  bottomInfoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});