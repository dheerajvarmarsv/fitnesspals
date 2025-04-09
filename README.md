can you check and think well in my profile settings i want something like in the image device and for ios show apple and watch and next allow the app to get data and then once allowed show that its conencted and fecth data and fectch above data and add to the summary now can you check my code and above files and fix the issue so that the healthkit works in my app in actual device without any erroracordingly think well and check current implenentation i dont see any of these and in my simulaotr and app i am getting error as you see in the jpeg file no function available error think well its very simple so can you check and think well in my profile settings i want something like in the image device and for ios show apple and watch and next allow the app to get data and then once allowed show that its conencted and fecth data and fectch above data and add to the summary now can you check my code and above files and fix the issue so that the healthkit works in my app in actual device without any erroracordingly think well and check current implenentation i dont see any of these and in my simulaotr and app i am getting error as you see in the jpeg file no function available error

the implementation is simple dont over complicate things and think well and understand my code and tell me how to do it Database Schema - Complete Tables and Columns
1. subscription_history
* id: UUID (primary key)
* user_id: UUID (foreign key)
* transaction_id: TEXT
* product_id: TEXT
* subscription_tier: TEXT
* payment_provider: TEXT
* amount: NUMERIC
* currency: TEXT
* start_date: TIMESTAMP
* end_date: TIMESTAMP
* status: TEXT
* created_at: TIMESTAMP
2. friends
* id: UUID (primary key)
* user_id: UUID (foreign key)
* friend_id: UUID (foreign key)
* status_id: TEXT
* created_at: TIMESTAMP
3. friend_requests
* id: UUID (primary key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
4. profile_settings
* id: UUID (primary key)
* timezone: TEXT
* display_mode: TEXT
* use_kilometers: BOOLEAN
* notification_settings: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
5. profiles
* id: UUID (primary key)
* email: TEXT
* nickname: TEXT
* avatar_url: TEXT
* settings: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* trial_stage: TEXT
* subscription_tier: TEXT
* subscription_expiry: TIMESTAMP
* subscription_status: TEXT
* trial_end_date: TIMESTAMP
* plan: TEXT
* description: TEXT
6. challenge
* id: UUID (primary key)
* description: TEXT
* challenge_type: TEXT
* status: TEXT
* start_date: TIMESTAMP
* end_date: TIMESTAMP
* is_private: BOOLEAN
* rules: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* survival_settings: JSONB
7. challenge_activities
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* user_id: UUID (foreign key)
* activity_type: TEXT
* points: INTEGER
* target_value: NUMERIC
* metric: TEXT
* timeframe: TEXT
8. activities
* id: UUID (primary key)
* user_id: UUID (foreign key)
* activity_type: TEXT
* duration: NUMERIC
* distance: NUMERIC
* calories: NUMERIC
* steps: INTEGER
* count: INTEGER
* notes: TEXT
* metric: TEXT
* source: TEXT
* created_at: TIMESTAMP
9. challenge_invites
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
10. challenge_participants
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* user_id: UUID (foreign key)
* status: TEXT
* joined_at: TIMESTAMP
* current_streak: INTEGER
* longest_streak: INTEGER
* total_points: INTEGER
* map_position: INTEGER
* last_awarded_day: DATE
* last_awarded_week: DATE
* last_activity_date: TIMESTAMP
* distance_from_center: NUMERIC
* angle: NUMERIC
* is_eliminated: BOOLEAN
* lives: INTEGER
* days_in_danger: INTEGER
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* processed_activity_ids: TEXT[]
11. challenge_rules
* challenge_id: UUID (foreign key, primary key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
12. health_data
* id: UUID (primary key)
* user_id: UUID (foreign key)
* date: DATE
* activity_id: UUID
* steps: INTEGER
* distance: NUMERIC
* calories: NUMERIC
* heart_rate: NUMERIC
* sleep_minutes: INTEGER
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
13. user_fitness_connections
* id: UUID (primary key)
* user_id: UUID (foreign key)
* type: TEXT
* connected: BOOLEAN
* last_synced: TIMESTAMP
* permissions: TEXT[]
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* source_id: TEXT
* expire_at: TIMESTAMP
* status: TEXT
* device_info: JSONB
* last_sync_status: TEXT
* last_sync_error: TEXT
* last_sync_count: INTEGER db for refercne so think all and tell me step by step what to do and hwo to add healthkit in my ios app and make it work in it

Based on the images and code you've shared, I can see that your app is having issues with Apple HealthKit integration. The error "Connection error: undefined is not a function" suggests there's a problem with the HealthKit initialization. Let me walk you through fixing this issue step by step.

Issue Analysis
Looking at your implementation and screenshots:

You're trying to create a fitness connection screen similar to what's shown in the screenshots, with the ability to connect to Apple Health and see connection status
The error occurs in your fitness-connections.tsx component when trying to interact with HealthKit
Your database schema has a health_data and user_fitness_connections table ready to store the synced data
The issue likely stems from improper initialization of HealthKit in your app
Fixing the HealthKit Integration
Let's address the issues systematically:

1. Fix the AppDelegate.mm Configuration
The first issue is that your AppDelegate.mm is missing the proper HealthKit initialization:

objective
// In AppDelegate.mm
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import "RCTAppleHealthKit.h" // Make sure this is present

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";
  self.initialProps = @{};
  
  // Get the RCTBridge instance
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  
  // Initialize HealthKit background observers
  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];
  
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// ... rest of your implementation
@end
2. Enhance your healthKit.ts Implementation
Your current healthKit.ts needs improvements. Here's a simplified but complete version:

typescript
// lib/healthKit.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import { supabase } from './supabase';

// Constants for storage
const HEALTHKIT_ENABLED_KEY = 'healthkit_enabled';
const HEALTHKIT_LAST_SYNC_KEY = 'healthkit_last_sync';

// Define all permissions we need
const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
  },
};

// Define available permission types
export interface HealthKitStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  permissions: {
    steps: boolean;
    calories: boolean;
    distance: boolean;
    heartRate: boolean;
    sleep: boolean;
  };
}

// Check if HealthKit is available
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((err: any, available: boolean) => {
      if (err) {
        console.error('Error checking HealthKit availability:', err);
        resolve(false);
        return;
      }
      resolve(available);
    });
  });
}

// Check if HealthKit is enabled in app settings
export async function isHealthKitEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HEALTHKIT_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking if HealthKit is enabled:', error);
    return false;
  }
}

// Initialize HealthKit with required permissions
export function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(false);

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, async (err: any) => {
      if (err) {
        console.error('Error initializing HealthKit:', err);
        resolve(false);
        return;
      }
      
      try {
        await AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'true');
        await AsyncStorage.setItem(HEALTHKIT_LAST_SYNC_KEY, new Date().toISOString());
        resolve(true);
      } catch (error) {
        console.error('Error saving HealthKit status:', error);
        resolve(false);
      }
    });
  });
}

// Get detailed HealthKit status
export async function getHealthKitStatus(): Promise<HealthKitStatus> {
  if (!(await isHealthKitAvailable())) {
    return {
      isAvailable: false,
      isAuthorized: false,
      permissions: {
        steps: false,
        calories: false,
        distance: false,
        heartRate: false,
        sleep: false,
      },
    };
  }

  // Check if HealthKit is enabled
  const enabled = await isHealthKitEnabled();
  if (!enabled) {
    return {
      isAvailable: true,
      isAuthorized: false,
      permissions: {
        steps: false,
        calories: false,
        distance: false,
        heartRate: false,
        sleep: false,
      },
    };
  }

  return new Promise((resolve) => {
    AppleHealthKit.getAuthStatus(PERMISSIONS, (err: any, result: any) => {
      if (err) {
        console.error('Error getting auth status:', err);
        resolve({
          isAvailable: true,
          isAuthorized: false,
          permissions: {
            steps: false,
            calories: false,
            distance: false,
            heartRate: false,
            sleep: false,
          },
        });
        return;
      }
      
      // Check status for each permission type
      const hasStepsPermission = result.permissions.read.includes(AppleHealthKit.Constants.Permissions.StepCount);
      const hasCaloriesPermission = result.permissions.read.includes(AppleHealthKit.Constants.Permissions.ActiveEnergyBurned);
      const hasDistancePermission = result.permissions.read.includes(AppleHealthKit.Constants.Permissions.DistanceWalkingRunning);
      const hasHeartRatePermission = result.permissions.read.includes(AppleHealthKit.Constants.Permissions.HeartRate);
      const hasSleepPermission = result.permissions.read.includes(AppleHealthKit.Constants.Permissions.SleepAnalysis);
      
      resolve({
        isAvailable: true,
        isAuthorized: hasStepsPermission || hasCaloriesPermission || hasDistancePermission,
        permissions: {
          steps: hasStepsPermission,
          calories: hasCaloriesPermission,
          distance: hasDistancePermission,
          heartRate: hasHeartRatePermission,
          sleep: hasSleepPermission,
        },
      });
    });
  });
}

// Disable HealthKit integration
export async function disableHealthKit(): Promise<void> {
  await AsyncStorage.removeItem(HEALTHKIT_ENABLED_KEY);
  await AsyncStorage.removeItem(HEALTHKIT_LAST_SYNC_KEY);
}

// Get last sync time
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(HEALTHKIT_LAST_SYNC_KEY);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

// Set up background observers for HealthKit data changes
export function setupBackgroundObservers(userId: string): void {
  if (Platform.OS !== 'ios') return;
  
  console.log('Setting up HealthKit background observers for user:', userId);
  
  // Set up event listeners for observers if needed
  // This will depend on how you want to handle background updates
}

// Get step count for a specific day
export function getStepCount(date: string): Promise<number> {
  if (Platform.OS !== 'ios') return Promise.resolve(0);

  const options = {
    date: date,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(options, (error: any, results: any) => {
      if (error) {
        console.error('Error getting step count:', error);
        resolve(0);
        return;
      }
      resolve(results?.value || 0);
    });
  });
}

// Get active energy burned
export function getActiveEnergyBurned(startDate: string, endDate: string): Promise<number> {
  if (Platform.OS !== 'ios') return Promise.resolve(0);

  const options = {
    startDate,
    endDate,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error: any, results: any) => {
      if (error) {
        console.error('Error getting active energy burned:', error);
        resolve(0);
        return;
      }
      
      let totalCalories = 0;
      if (Array.isArray(results)) {
        totalCalories = results.reduce((sum, item) => sum + (item.value || 0), 0);
      } else if (results && typeof results.value === 'number') {
        totalCalories = results.value;
      }
      
      resolve(Math.round(totalCalories));
    });
  });
}

// Sync health data
export async function syncHealthData(userId: string, date: string): Promise<void> {
  if (!userId || Platform.OS !== 'ios') return;
  
  try {
    const enabled = await isHealthKitEnabled();
    if (!enabled) return;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startDateString = startOfDay.toISOString();
    const endDateString = endOfDay.toISOString();
    
    // Get step count
    const steps = await getStepCount(date);
    
    // Get calories burned
    const calories = await getActiveEnergyBurned(startDateString, endDateString);
    
    // Insert data to Supabase
    const { error } = await supabase
      .from('health_data')
      .upsert({
        user_id: userId,
        date,
        steps,
        calories,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    
    // Update user fitness connection
    await supabase
      .from('user_fitness_connections')
      .upsert({
        user_id: userId,
        type: 'apple_health',
        connected: true,
        last_synced: new Date().toISOString(),
        status: 'connected',
        last_sync_status: 'success',
        last_sync_count: steps + (calories > 0 ? 1 : 0),
      });
    
    // Save last sync time
    await AsyncStorage.setItem(HEALTHKIT_LAST_SYNC_KEY, new Date().toISOString());
    
  } catch (error) {
    console.error('Error syncing health data:', error);
    
    // Update connection status to error
    await supabase
      .from('user_fitness_connections')
      .upsert({
        user_id: userId,
        type: 'apple_health',
        connected: true,
        last_synced: new Date().toISOString(),
        status: 'error',
        last_sync_status: 'error',
        last_sync_error: String(error),
      });
    
    throw error;
  }
}
3. Update your fitness-connections.tsx Component
Here's an improved version of your fitness-connections.tsx component:

tsx
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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
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
import { supabase } from '../../../lib/supabase';

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
  const [connection, setConnection] = useState<any>(null);

  // Check availability and load connection status on component mount
  useEffect(() => {
    checkAvailability();
    loadLastSyncTime();
    loadConnectionStatus();
  }, []);

  const loadLastSyncTime = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const loadConnectionStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_fitness_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'apple_health')
        .single();
      
      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error('Error loading connection status:', error);
    }
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
      await loadConnectionStatus();
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
            await loadConnectionStatus();
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
        
        if (user?.id) {
          await supabase
            .from('user_fitness_connections')
            .upsert({
              user_id: user.id,
              type: 'apple_health',
              connected: false,
              status: 'disconnected',
              updated_at: new Date().toISOString(),
            });
        }
        
        await loadConnectionStatus();
        
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

  return (
    <SharedLayout style={styles.container}>
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
                    {hasError ? (
                      <Text style={styles.errorText}>
                        Connection error: {errorMessage || 'Could not connect to Apple Health'}
                      </Text>
                    ) : (
                      <Text style={styles.cardDescription}>
                        {healthKitEnabled 
                          ? "Sync steps, workouts, and calories with Apple Health" 
                          : "Connect to Apple Health to sync your fitness data"}
                      </Text>
                    )}
                    {lastSync && healthKitEnabled && (
                      <Text style={styles.lastSyncText}>
                        Last synced: {new Date(lastSync).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  
                  {hasError ? (
                    <TouchableOpacity 
                      style={styles.retryButton} 
                      onPress={checkAvailability}
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
                    <PermissionItem 
                      title="Steps" 
                      isEnabled={healthKitStatus.permissions.steps} 
                      icon="footsteps"
                    />
                    <PermissionItem 
                      title="Calories" 
                      isEnabled={healthKitStatus.permissions.calories} 
                      icon="flame"
                    />
                    <PermissionItem 
                      title="Distance" 
                      isEnabled={healthKitStatus.permissions.distance} 
                      icon="map"
                    />
                    {connection?.last_sync_count > 0 && (
                      <Text style={styles.syncStatsText}>
                        Last sync: {connection.last_sync_count} data points
                      </Text>
                    )}
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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manual Activity Tracking</Text>
              <Text style={styles.cardDescription}>
                You can always log your activities manually even if you don't connect to health services.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/')}
              >
                <Text style={styles.actionButtonText}>Go to Activity Tracking</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SharedLayout>
  );
}

// Helper component for permission items
function PermissionItem({ title, isEnabled, icon }: { title: string, isEnabled: boolean, icon: string }) {
  return (
    <View style={styles.permissionItem}>
      <View style={styles.permissionLeft}>
        <Ionicons name={icon as any} size={20} color="#555" style={styles.permissionIcon} />
        <Text style={styles.permissionText}>{title}</Text>
      </View>
      <View style={[
        styles.statusBadge, 
        isEnabled ? styles.statusBadgeActive : styles.statusBadgeInactive
      ]}>
        <Text style={[
          styles.statusText,
          isEnabled ? styles.statusTextActive : styles.statusTextInactive
        ]}>
          {isEnabled ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
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
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
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
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(189, 189, 189, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  statusTextInactive: {
    color: '#9E9E9E',
  },
  syncStatsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
4. Update Package.json
Make sure your package.json has the correct dependencies:

json
"dependencies": {
  // ... other dependencies
  "react-native-health": "^1.19.0"
}
5. Update app.json/app.config.ts
Ensure your app.config.ts includes all the necessary configurations:

typescript
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  // ... existing config
  ios: {
    // ... existing iOS config
    infoPlist: {
      // ... other configs
      NSHealthShareUsageDescription: "Allow CTPs to read your health data to track your activities including steps, calories, and workouts.",
      NSHealthUpdateUsageDescription: "Allow CTPs to write your health data to track your activities and sync with Apple Health.",
      UIRequiredDeviceCapabilities: [
        "arm64",
        "healthkit"
      ]
    },
    entitlements: {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.background-delivery": true,
    },
  },
  // ... other config
  plugins: [
    // ... other plugins
    [
      "react-native-health",
      {
        isClinicalDataEnabled: false,
        healthSharePermission: "Allow CTPs to read your health data",
        healthUpdatePermission: "Allow CTPs to update your health data",
      },
    ],
  ],
});
6. Update your Info.plist
Make sure your Info.plist has all the necessary keys:

xml
<key>NSHealthShareUsageDescription</key>
<string>Allow CTPs to read your health data to track your activities including steps, calories, and workouts.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Allow CTPs to write your health data to track your activities and sync with Apple Health.</string>
<key>UIRequiredDeviceCapabilities</key>
<array>
  <string>arm64</string>
  <string>healthkit</string>
</array>
7. Update Entitlements File (CTP.entitlements)
Make sure your entitlements file has the necessary HealthKit permissions:

xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.

continue

I'll continue with the entitlements file and the remaining steps to fix the HealthKit integration in your app.

7. Update Entitlements File (CTP.entitlements)
Make sure your entitlements file has the necessary HealthKit permissions:

xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
    <key>com.apple.developer.healthkit.background-delivery</key>
    <true/>
  </dict>
</plist>
8. Create a Plugin to Modify AppDelegate
Create a file called plugins/ios-healthkit-config/index.js to ensure the AppDelegate is modified correctly when building:

javascript
const { withAppDelegate } = require("@expo/config-plugins");

module.exports = function withHealthKitConfig(config) {
  return withAppDelegate(config, async (config) => {
    if (config.modResults.contents.includes('initializeBackgroundObservers')) {
      return config;
    }

    // Add import statement if it doesn't exist
    const importStatement = `#import "RCTAppleHealthKit.h"`;
    if (!config.modResults.contents.includes(importStatement)) {
      config.modResults.contents = config.modResults.contents.replace(
        '#import <React/RCTLinkingManager.h>',
        `#import <React/RCTLinkingManager.h>\n${importStatement}`
      );
    }

    // Add HealthKit initialization
    config.modResults.contents = config.modResults.contents.replace(
      'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];',
      'RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];\n  // Initialize HealthKit background observers\n  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];'
    );

    return config;
  });
};
Then, add this plugin to your app.config.ts:

typescript
plugins: [
  // ... other plugins
  "./plugins/ios-healthkit-config",
  [
    "react-native-health",
    {
      healthSharePermission: "Allow CTPs to read your health data",
      healthUpdatePermission: "Allow CTPs to update your health data",
    }
  ],
]
9. Add New Database Model (if needed)
Create a new model for tracking health connections:

typescript
// models/healthConnections.ts
import { supabase } from '../lib/supabase';

export interface HealthConnection {
  id: string;
  user_id: string;
  type: string;
  connected: boolean;
  last_synced?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getHealthConnections(userId: string): Promise<HealthConnection[]> {
  const { data, error } = await supabase
    .from('user_fitness_connections')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data || [];
}

export async function upsertHealthConnection(connection: any): Promise<void> {
  const { error } = await supabase
    .from('user_fitness_connections')
    .upsert(connection);
    
  if (error) throw error;
}
10. Update UserContext.tsx to Support HealthKit
Enhance your UserContext.tsx to include HealthKit setup:

typescript
// components/UserContext.tsx - Add these imports and functionality
import { initHealthKit, setupBackgroundObservers, isHealthKitAvailable } from '../lib/healthKit';

// Inside UserProvider component
useEffect(() => {
  // Initialize HealthKit if enabled
  const initializeHealthKit = async () => {
    try {
      if (user && Platform.OS === 'ios' && await isHealthKitAvailable()) {
        const { data } = await supabase
          .from('user_fitness_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'apple_health')
          .single();
          
        if (data?.connected) {
          console.log('Setting up HealthKit background observers');
          setupBackgroundObservers(user.id);
        }
      }
    } catch (error) {
      console.error('Error initializing HealthKit:', error);
    }
  };

  if (user) {
    initializeHealthKit();
  }
}, [user]);
Step-by-Step Implementation Process
Now, let me outline the specific steps you need to take to implement this solution:

First, check if you already have the react-native-health library installed. If not, install it:
bash
npm install react-native-health
Update your AppDelegate.mm file with the code I provided in step 1, making sure to add the import for RCTAppleHealthKit and initialize the background observers.
Create or update your healthKit.ts file in the lib folder with the implementation I provided.
Update your fitness-connections.tsx component with the improved version I provided.
Make sure your app.config.ts or app.json has the correct HealthKit configuration.
Create the plugin file to ensure AppDelegate modifications are applied correctly during builds.
Update your Info.plist and entitlements files to include the required HealthKit permissions.
Create a model for tracking health connections if you need it.
Test on a real device, not in the simulator (HealthKit requires a real device).
Solving the Error "Connection error: undefined is not a function"
The specific error you're seeing ("undefined is not a function") typically occurs when trying to call a method that doesn't exist or hasn't been properly initialized. In the context of HealthKit, this likely means that:

The AppleHealthKit module is not being imported correctly
The module is imported, but methods are being called before initialization
There's a platform check issue (trying to use iOS-specific code on a non-iOS platform)
The solution I've provided addresses all these possible causes:

Proper imports in AppDelegate.mm
Platform-specific checks in the healthKit.ts file
Proper initialization sequence
Error handling with meaningful error messages
UI updates to show connection status
Once implemented, your app should be able to:

Show the Apple Health option in the fitness connections screen
Allow users to toggle the connection
Display connection status with permissions
Sync health data manually
Store data in your Supabase database
Let me know if you have any questions or need further clarification on any part of the implementation!







Unleashing the Potential of React Native Healthkit: Strengthening Health and Fitness Apps
Fitness and health are changing due to wearable technology, which provides real-time data about our well-being. Wearables transform healthcare by changing how diseases are managed, prevented, and treated. These health monitoring devices enable users to make better decisions by providing rapid access to critical indicators like heart rate and activity levels. 

React Native Healthkit

React Native Health solutions allow developers to build mobile apps that seamlessly integrate with Apple HealthKit devices. This integration is crucial for enabling the collection and sharing of health data across multiple platforms, providing users with a unified health monitoring experience.

Furthermore, wearables are revolutionizing healthcare delivery by allowing telemedicine and remote patient monitoring, guaranteeing everyone’s access to care. In this blog, we’ll discuss React Native HealthKit. To communicate with Apple HealthKit for iOS, we will use React Native Health, a react native package that allows access to health and fitness data exposed by Apple HealthKit. The methods are available here. 

We will go through using the Apple HealthKit APIs and gaining access to Apple HealthKit in detail.

Getting Started
The “Expo Go” app is unable to utilise this package. Find out how to apply it for bespoke development clients.

Installation
First and foremost, we can start by installing the react-native-health in our React-Native project.

Run the following command:
You can use either npm or yarn to install the package.

  yarn add react-native-health

or

  npm i react-native-health

If you are using CocoaPods, you can run the following from the ios/ folder of your app.
  pod install

Or, if you need to link it manually, run
  react-native link react-native-health

Update the ios/<Project Name>/info.plist file in your project
  <key>NSHealthShareUsageDescription</key>

  <string>Read and understand health data.</string>

  <key>NSHealthUpdateUsageDescription</key>

  <string>Share workout data with other apps.</string>

  <!– Below is only required if requesting clinical health data –>

  <key>NSHealthClinicalHealthRecordsShareUsageDescription</key>

  <string>Read and understand clinical health data.</string>

To add Healthkit support to your application’s Capabilities

Launch Xcode and navigate to your project’s ios/ folder.
Choose the project name from the sidebar on the left.
Double click ‘HealthKit’ after selecting ‘+ Capability’ in the central pane.
Check the box next to Clinical Health Records to allow access to certain types of clinical data.
Usage:
Before you can begin data collection or storage in HealthKit, you must ask the user for permission to collect or save the specified data types. There are several ways to do this.
 

import AppleHealthKit, {

    HealthKitPermissions,

  } from ‘react-native-health’

  /* Permission options */

  const permissions = {

    permissions: {

      read: [AppleHealthKit.Constants.Permissions.HeartRate],

      write: [AppleHealthKit.Constants.Permissions.Steps],

    },

  }

as HealthKitPermissions

Click here for additional permissions.

Background Processing
Apple permits developers to set up persistent observer queries for the required health kinds to have background capabilities.

Open your ios/AppDelegate.m file in XCode and add the following statements to configure that in your app:

  #import “AppDelegate.h”  /* Add the library import at the top of AppDelegate.m */

  #import “RCTAppleHealthKit.h”

  @implementation AppDelegate

  – (BOOL)application:(UIApplication *)application

      didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {

    RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self

    launchOptions:launchOptions];

    /* Add Background initializer for HealthKit  */

    [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];

    return YES;

  }

Subsequently, you can use the React Native client to listen for data updates. See background observers for additional details.

Initialize Apple HealthKit
  AppleHealthKit.initHealthKit(    (options: HealthInputOptions),

    (err: string, results: boolean) => {

      if (err) {

        console.log(‘error initializing Healthkit: ‘, err)

        return

      }

      // Healthkit is initialized…

      //Now it is safe to read and write Healthkit data…

    },

  )

Check for HealthKit availability.
 Import AppleHealthKit from ‘react-native-health’

  AppleHealthKit.isAvailable((err: Object, available: boolean) => {

    if (err) {

      console.log(‘error initializing Healthkit: ‘, err)

      return

    }

  })

Example output:
  true
Implementation
implementation of react native healthkit

To fully leverage the capabilities of the Apple Watch, it’s essential to enable HealthKit on Apple Watch. By doing so, developers can create apps that not only track fitness metrics but also synchronize this data across various health apps, ensuring users have a comprehensive view of their health.

We will now review various samples that may be obtained from the Apple HealthKit using the Apple HealthKit API’s. 

Weight
Height
BMI
Biological Sex
Energy Consumed
Protein
Insulin Delivery
Daily Step Count
Step Count
Calories
ActiveEnergyBurned
BasalEnergyBurned
DailyDistanceWalkingRunning
DailyDistanceSwimming
Sleep
Blood Pressure
Electrocardiogram
Heart Rate
Heart Rate Variability
Heartbeat Series
Oxygen Saturation
Resting Heart Rate
Vo2Max
Respiratory Rate
Walking Heart Rate
Weight:
Code Sample
  let options = {    unit: ‘pound’, // optional; default ‘pound’

   startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  AppleHealthKit.getWeightSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

    // The universally unique identifier (UUID) for this HealthKit object.

      “id”: “3d366e60-4f7c-4f72-b0ce-479ea19279b8”,  

      “value”: 160,

      “startDate”: “2024-07-09T00:00:00.000-0400”,

      “endDate”: “2024-07-10T00:00:00.000-0400”,

      “metadata”: {

       “HKWasUserEntered”: false

      }

    },

    {

      “id”: “cb7a2de6-f8d2-48cc-8cca-3d9f58a3601a”,

      “value”: 161,

      “startDate”: “2024-07-08T00:00:00.000-0400”,

      “endDate”: “2024-07-09T00:00:00.000-0400”,

      “metadata”: {

       “HKWasUserEntered”: false

      }

    },

    {

      “id”: “4dddd4da-2adf-4d1c-a400-10790ffe2c0d”,

      “value”: 165,

      “startDate”: “2024-07-07T00:00:00.000-0400”,

      “endDate”: “2024-07-08T00:00:00.000-0400”,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]

Healthcare app development
Height
Code Sample
  let options = {    unit: ‘inch’, // optional; default ‘inch’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  AppleHealthKit.getHeightSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

    // The universally unique identifier (UUID) for this HealthKit object.

      “id”: “3d366e60-4f7c-4f72-b0ce-479ea19279b8”, 

      “value”: 74.02,

      “startDate”: “2024-06-29T17:55:00.000-0400”,

      “endDate”: “2024-06-29T17:55:00.000-0400”,

      “metadata”: {

       “HKWasUserEntered”: true,

      }

  },

  {

    “id”: “19a9910d-230a-437f-a830-353f6e61f676”,

    “value”: 74,

    “startDate”: “2024-03-12T13:22:00.000-0400”,

    “endDate”: “2024-03-12T13:22:00.000-0400”,

    “metadata”: {

        “HKWasUserEntered”: true,

      }

    }

  ]

BMI
Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  AppleHealthKit.getBmiSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

      “endDate”: “2024-10-10T09:19:00.000+0000”, 

    // The universally unique identifier (UUID) for this HealthKit object.

      “id”: “73A653BA-4715-47BD-98FE-E9AA91DB33CA”, 

      “sourceId”: “com.apple.Health”, 

      “sourceName”: “Health”, 

      “startDate”: “2024-10-19T09:19:00.000+0000”, 

      “value”: 18.5

    },

    {

      “endDate”: “2024-08-23T08:50:00.000+0000”,

      “id”: “B3D8B5BE-216C-4C10-A96E-3B2CF8EB646E”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

      “startDate”: “2024-08-23T08:50:00.000+0000”,

      “value”: 18.83

    }

  ]

Biological Sex
Code Sample
  AppleHealthKit.getBiologicalSex(null, (err: Object, results: Object) =>       {

    if (err) {

      return

    }

    console.log(results)

  })

Output
  {    “value”: “female”

  }

Energy Consumed
Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

  }

  AppleHealthKit.getEnergyConsumedSamples(

    (options: HealthInputOptions),

    (err: Object, results: HealthValue) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

      “endDate”: “2024-04-01T22:00:00.000+0300”, 

      “startDate”: “2024-04-01T22:00:00.000+0300”, 

      “value”: 204.5,

      “metadata”: {

        “HKWasUserEntered”: true,

      }

    }

  ]

Protein
Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

  }

  AppleHealthKit.getProteinSamples(

    (options: HealthInputOptions),

    (err: Object, results: HealthValue) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, 

  // The universally unique identifier (UUID) for this HealthKit object.

      “endDate”: “2024-04-01T22:00:00.000+0300”, 

      “startDate”: “2024-04-01T22:00:00.000+0300”, 

      “value”: 39,

      “metadata”: {

        “HKWasUserEntered”: true,

      }

    }

  ]

Insulin Delivery
Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  AppleHealthKit.getInsulinDeliverySamples(

      options,

      (callbackError: string, results: HealthValue[]) => {

          console.log(results)

      },

  );

Output
  [    {

      “id”: “8DE6A905-02B7-41D2-BB6E-67D1DD82DD6F”, // The universally unique identifier (UUID) for this HealthKit object.

      “endDate”: “2024-03-22T16:19:00.000-0300”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

     “startDate”: “2024-03-22T16:19:00.000-0300”,

      “value”: 5,

      “metadata”: {

        “HKWasUserEntered”: true,

        “HKInsulinDeliveryReason”: 2, // Basal = 1, Bolus = 2

      }

    }

  ]

 

Daily Step Count
Code Sample
  let options = {      startDate: (new Date(2024,1,1)).toISOString() // required

      endDate:   (new Date()).toISOString() // optional; default now

  };

 

  AppleHealthKit.getDailyStepCountSamples(

    (options: HealthInputOptions),

    (err: Object, results: Array<Object>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
 [    {

      “endDate”: “2024-03-22T17:00:00.000-0300”,

      “startDate”: “2024-03-22T16:00:00.000-0300”,

      “value”: 3978

    }

  ]

 

Step Count
Code Sample
  let options = {      date: new Date().toISOString(), // optional; default now

      includeManuallyAdded: false. // optional: default true

  };

 

  AppleHealthKit.getStepCount(

    (options: HealthInputOptions),

    (err: Object, results: HealthValue) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  {    “value”: 213

  }

 

Active Energy Burned / Active Kilocalories
Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: true, // optional

    includeManuallyAdded: true, // optional

  }

 

 

  AppleHealthKit.getActiveEnergyBurned(

    (options: HealthInputOptions),

    (err: Object, results: HealthValue) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

      “endDate”: “2024-03-22T16:00:00.000-0300”,

      “startDate”: “2024-03-22T15:00:00.000-0300”,

      “value”: 123

    }

  ]

 

Basal Energy Burned / Resting Energy
Code Sample
  let options = {    startDate: new Date(2018, 10, 1).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: true, // optional

    includeManuallyAdded: true, // optional

  }

 

  AppleHealthKit.getBasalEnergyBurned(

    (options: HealthInputOptions),

    (err: Object, results: HealthValue) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
    [

    {

      “endDate”: “2024-03-22T17:00:00.000-0300”,

      “startDate”: “2024-03-22T16:00:00.000-0300”,

      “value”: 42

    }  

  ]

 

Sleep
Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    limit: 10, // optional; default no limit

    ascending: true, // optional; default false

  }

 

  AppleHealthKit.getSleepSamples(options, (err: Object, results:     Array<HealthValue>) => {

    if (err) {

      return;

    }

    console.log(results).

   });

Output
    [

    {

      “id”: “3d366e60-4f7c-4f72-b0ce-479ea19279b8”, // The universally   unique identifier (UUID) for this HealthKit object.

      “endDate”: “2024-03-22T16:34:00.000-0300”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

      “startDate”: “2024-03-22T15:34:00.000-0300”,

      “value”: “INBED”

    }

  ]

 

Blood Pressure
Code Sample
  let options = {    unit: ‘mmhg’, // optional; default ‘mmhg’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

 

  AppleHealthKit.getBloodPressureSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [    {

      “bloodPressureSystolicValue”: 120,

      “bloodPressureDiastolicValue”: 81,

      “startDate”: “2024-06-29T17:55:00.000-0400”,

      “endDate”: “2024-06-29T17:55:00.000-0400”

    },

    {

      “bloodPressureSystolicValue”: 119,

      “bloodPressureDiastolicValue”: 77,

      “startDate”: “2024-03-12T13:22:00.000-0400”,

      “endDate”: “2024-03-12T13:22:00.000-0400”

    }

  ]

 

Electrocardiogram
Code Sample
 let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 1, // optional; default no limit

  }

 

  AppleHealthKit.getElectrocardiogramSamples(

    (options: HealthInputOptions),

    (err: Object, results: ElectrocardiogramSampleValue[]) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )

Output
  [

    {

      “id”: “5AF5F9E0-F27E-4BD7-8DBD-B7E00B9C68CF”,

      “sourceName”: “ECG”,

      “sourceId”: “com.apple.NanoHeartRhythm”,

      “startDate”: “2024-06-16T19:10:52.498-0400”,

      “endDate”: “2024-06-16T19:11:22.499-0400”,

      “classification”: “SinusRhythm”, 

     // see ElectrocardiogramClassification enum

      “averageHeartRate”: 62,

      “samplingFrequency”: 512.6171875,

      “device”: “Watch4,1”,

      “algorithmVersion”: 2,

      “voltageMeasurements”: [

        // [timeSinceSampleStart (s), voltage (V)]

        [0, -0.000007642375469207763],

        [0.0019507734511925627, -0.000005802469730377197],

        [0.0039015469023851255, -0.000003958822011947631],

        [0.005852320353577688, -0.0000021150546073913572],

        [0.007803093804770251, -2.747770547866821e-7],

        // …

        [29.991191038634458, -0.00003649459075927734],

        [29.99314181208565, -0.000035267024993896485],

        [29.995092585536845, -0.000033975482940673826],

        [29.997043358988037, -0.00003262416076660156],

        [29.99899413243923, -0.000031217338562011714]

      ]

    }

  ]



Heart Rate
Code Sample
  let options = {    unit: ‘bpm’, // optional; default ‘bpm’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

 

  AppleHealthKit.getHeartRateSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )


Output
  [    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, 

     // The universally unique identifier (UUID) for this HealthKit object.

      “value”: 74.02,

      “startDate”: “2024-06-29T17:55:00.000-0400”,

      “endDate”: “2024-06-29T17:55:00.000-0400”,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    },

    {

      “id”: “4ea9e479-86e2-4e82-8030-86a9a9b8e569”,

      “value”: 74,

      “startDate”: “2024-03-12T13:22:00.000-0400”,

      “endDate”: “2024-03-12T13:22:00.000-0400”,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]


 

Heart Rate Variability
Code Sample
  let options = {    unit: ‘second’, // optional; default ‘second’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

 

  

  AppleHealthKit.getHeartRateVariabilitySamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )


Output
   [

    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, 

   // The universally unique identifier (UUID) for this HealthKit object.

      “value”: 0.4223,

      “startDate”: “2024-03-12T13:22:00.000-0400”,

      “endDate”: “2024-03-12T13:22:00.000-0400”,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]


 

Heartbeat Series
 

Code Sample
  let options = {    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

 

  AppleHealthKit.getHeartbeatSeriesSamples(

    options,

    (err: Object, results: HeartbeatSeriesSampleValue[]) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )


Output
  [    {

      “id”: “9728168D-CFD4-4946-BF94-2789ECD39A72”,

      “sourceName”: “Apple Watch”,

      “startDate”: “2024-07-10T08:55:31.307-0400”,

      “endDate”: “2024-07-10T08:56:34.731-0400”,

      “sourceId”: “com.apple.health”,

      “heartbeatSeries”: [

        {

          “timeSinceSeriesStart”: 0.97265625,

          “precededByGap”: false

        },

        {

          “timeSinceSeriesStart”: 1.55859375,

          “precededByGap”: false

        },

        {

          “timeSinceSeriesStart”: 2.16015625,

          “precededByGap”: false

        },

      ]

    }

  ]


 

Oxygen Saturation
Code Sample
  let options = {    startDate: new Date(2024, 1, 1).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

 

  AppleHealthKit.getOxygenSaturationSamples(

    options,

    (callbackError: Object, results: Array<HealthValue>) => {

      if (callbackError) {

        return

      }

      console.log(results)

    },

  )


Output
  [

    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, // The universally unique identifier (UUID) for this HealthKit object.

      “endDate”: “2024-03-04T10:56:00.000-0500”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

      “startDate”: “2024-03-04T10:56:00.000-0500”,

      “value”: 0.98,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    },

    {

      “id”: “86ff59e7-f393-4f32-95fb-b0bf7027374d”,

      “endDate”: “2024-03-04T09:55:00.000-0500”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

      “startDate”: “2024-03-04T09:55:00.000-0500”,

      “value”: 0.97,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    },

  ]

Resting Heart Rate
Code Sample
  let options = {    unit: ‘bpm’, // optional; default ‘bpm’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  

  AppleHealthKit.getRestingHeartRateSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )


Output
    [

    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, // The universally unique identifier (UUID) for this HealthKit object.

      “value”: 74,

      “startDate”: “2024-03-12T13:22:00.000-0400”,

      “endDate”: “2024-03-12T13:22:00.000-0400”,

    “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]


 

Vo2Max
 

Code Sample
  let options = {    unit: ‘bpm’, // optional; default ‘ml/(kg * min)’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  

  AppleHealthKit.getVo2MaxSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )


Output
    [

    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, // The universally unique identifier (UUID) for this HealthKit object.

      “endDate”: “2024-03-22T16:35:00.000-0300”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

      “startDate”: “2024-03-22T16:35:00.000-0300”,

      “value”: 2,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]


 

Respiratory Rate
Code Sample
  let options = {    unit: ‘bpm’, // optional; default ‘bpm’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  AppleHealthKit.getRespiratoryRateSamples(

    options,

    (err: Object, results: Array<HealthValue>) => {

      if (err) {

        return

      }

      console.log(results)

    },

  )


Output
    [

    {

      “id”: “5013eca7-4aee-45af-83c1-dbe3696b2e51”, // The universally unique identifier (UUID) for this HealthKit object.

      “endDate”: “2024-03-22T16:32:00.000-0300”,

      “sourceId”: “com.apple.Health”,

      “sourceName”: “Health”,

      “startDate”: “2024-03-22T16:32:00.000-0300”,

      “value”: 45,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]


Walking Heart Rate
Code Sample
  let options = {    unit: ‘bpm’, // optional; default ‘bpm’

    startDate: new Date(2024, 0, 0).toISOString(), // required

    endDate: new Date().toISOString(), // optional; default now

    ascending: false, // optional; default false

    limit: 10, // optional; default no limit

  }

  AppleHealthKit.getWalkingHeartRateAverage(

    options,

    (err: Object, results: HealthValue[]) => {

      if (err) {

        return;

      }

      console.log(results);

    },

  )


Output
  [    {

      “value”: 77,

      “sourceId”: “com.apple.health”,

      “id”: “6AFB1A69-0165-4495-9B9A-7C594B63D88C”,

      “sourceName”: “Source”,

      “startDate”: “2024-07-05T12:53:58.870-0400”,

      “endDate”: “2024-07-05T15:14:23.413-0400”,

      “metadata”: {

       “HKWasUserEntered”: false

      }

    },

    {

      “value”: 73,

      “sourceId”: “com.apple.health”,

      “id”: “A13D758C-DCD4-44FA-87A9-7DD63DED31F6”,

      “sourceName”: “Source”,

      “startDate”: “2024-07-04T00:00:25.881-0400”,

      “endDate”: “2024-07-04T11:39:15.130-0400”,

      “metadata”: {

        “HKWasUserEntered”: false

      }

    }

  ]


Conclusion
To sum up, the React Native Health library provides developers with an extensive toolkit to design all-encompassing health and fitness applications. Developers may create scalable, user-friendly solutions, enabling people to track fitness objectives, keep an eye on their health, and make educated lifestyle decisions by utilizing the benefits of React Native with wearable technology.

For developers looking to build cross-platform health apps, React Native Apple Watch development is a powerful approach. It enables the creation of robust health applications that work seamlessly with Apple’s ecosystem, ensuring that users can monitor their health data in real-time and across all their devices.

The React Native Health library is leading the way in innovation as technology develops, advancing digital health and completely changing how we think about personal wellness. It is important that we accept wearable technology’s promise to unlock a healthy future right now! Find out more about wearable devices for health monitoring and the future of wearable technology in healthcare. 

Detailed Example

For a more detailed example, check out the example from the library here:

react-native-health 

References

Apple Healthkit Documentation

Frequently Asked Questions
How Do I Enable HealthKit on My Watch? / How Do I Activate Health on Apple Watch?
Both questions have the same answer. If you have an iPhone with the HealthKit app, your Apple watch will sync all HealthKit data to it. All you need is an Apple watch and an iPhone with HealthKit enabled.

Is Healthkit the Same as Apple Health?
Yes, the HealthKit framework is built into Apple Watches and iPhones. This allows applications to access your health data consensually. 

How to Enable HealthKit on Your App?
While enabling HealthKit happens on the user’s device, your React Native app can request permission to access specific health data types. Here are some popular libraries to help you integrate HealthKit React Native:

react-native-health GitHub repository for react-native-health: https://github.com/agencyenterprise/react-native-health
react-native-healthkit GitHub repository for react-native-healthkit: https://github.com/kingstinct/react-native-healthkit
How to Enable HealthKit on an iPhone?
There’s no single switch to enable HealthKit on an iPhone. It’s automatically enabled when you use the Health app. Granting permission to access HealthKit data happens within individual apps that request it.

Is Setting up HealthKit on Independent Apple Watch app possible?
Unfortunately, you cannot integrate HealthKit directly into a standalone Apple Watch app. HealthKit functionality is currently limited to apps running on an iPhone that can communicate with a paired Apple Watch.

 

