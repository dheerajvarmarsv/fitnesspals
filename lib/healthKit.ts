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