import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import { supabase } from './supabase';
import { NativeEventEmitter, NativeModules } from 'react-native';

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
      AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Workout,
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
  if (!isHealthKitAvailable()) {
    return false;
  }
  
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
  if (!isHealthKitAvailable()) {
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

  return new Promise((resolve) => {
    const options = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.RestingHeartRate,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
        ],
        write: [],
      },
    };

    AppleHealthKit.isAvailable((error: Object, available: boolean) => {
      if (error) {
        console.error('Error checking HealthKit availability:', error);
        resolve({
          isAvailable: false,
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

      if (!available) {
        resolve({
          isAvailable: false,
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

      AppleHealthKit.initHealthKit(options, (error: Object) => {
        if (error) {
          console.error('Error initializing HealthKit:', error);
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

        // Check individual permissions
        const checkPermission = (type: any) => {
          return new Promise<boolean>((resolve) => {
            AppleHealthKit.getAuthStatus({ permissions: { read: [type], write: [] } }, 
              (err: Object, result: any) => {
                resolve(!err && result.permissions.read[0] === 2);
              }
            );
          });
        };

        Promise.all([
          checkPermission(AppleHealthKit.Constants.Permissions.StepCount),
          checkPermission(AppleHealthKit.Constants.Permissions.ActiveEnergyBurned),
          checkPermission(AppleHealthKit.Constants.Permissions.DistanceWalkingRunning),
          checkPermission(AppleHealthKit.Constants.Permissions.HeartRate),
          checkPermission(AppleHealthKit.Constants.Permissions.SleepAnalysis),
        ]).then(([steps, calories, distance, heartRate, sleep]) => {
          resolve({
            isAvailable: true,
            isAuthorized: steps || calories || distance || heartRate || sleep,
            permissions: {
              steps,
              calories,
              distance,
              heartRate,
              sleep,
            },
          });
        });
      });
    });
  });
}

// Disable HealthKit integration
export async function disableHealthKit(): Promise<void> {
  await AsyncStorage.multiRemove([HEALTHKIT_ENABLED_KEY, HEALTHKIT_LAST_SYNC_KEY]);
}

// Set up background observers
export function setupBackgroundObservers(userId: string): void {
  if (!isHealthKitAvailable()) return;
  
  console.log('Setting up HealthKit background observers for user:', userId);
  
  // Set up event listeners for real-time updates
  try {
    const healthKitEmitter = new NativeEventEmitter(NativeModules.AppleHealthKit);
    
    // Listen for step count updates
    healthKitEmitter.addListener(
      'healthKit:StepCount:new',
      async () => {
        console.log('New step count data detected');
        const today = new Date().toISOString().split('T')[0];
        await syncHealthData(userId, today);
      }
    );
    
    // Listen for active energy burned updates
    healthKitEmitter.addListener(
      'healthKit:ActiveEnergyBurned:new',
      async () => {
        console.log('New calories data detected');
        const today = new Date().toISOString().split('T')[0];
        await syncHealthData(userId, today);
      }
    );
    
    // Listen for distance updates
    healthKitEmitter.addListener(
      'healthKit:DistanceWalkingRunning:new',
      async () => {
        console.log('New distance data detected');
        const today = new Date().toISOString().split('T')[0];
        await syncHealthData(userId, today);
      }
    );
    
    // Listen for heart rate updates
    healthKitEmitter.addListener(
      'healthKit:HeartRate:new',
      async () => {
        console.log('New heart rate data detected');
        const today = new Date().toISOString().split('T')[0];
        await syncHealthData(userId, today);
      }
    );
    
    console.log('HealthKit listeners set up successfully');
  } catch (error) {
    console.error('Error setting up HealthKit listeners:', error);
  }
}

// Get step count for a specific day
export function getStepCount(date: string): Promise<number> {
  if (!isHealthKitAvailable()) return Promise.resolve(0);

  const options = {
    date: date,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(options, (error: string, results: { value: number }) => {
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
  if (!isHealthKitAvailable()) return Promise.resolve(0);

  const options = {
    startDate,
    endDate,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error: string, results: any) => {
      if (error) {
        console.error('Error getting active energy burned:', error);
        resolve(0);
        return;
      }
      
      let totalCalories = 0;
      if (Array.isArray(results)) {
        totalCalories = results.reduce((sum, item: any) => sum + (item.value || 0), 0);
      } else if (results && typeof results.value === 'number') {
        totalCalories = results.value;
      }
      
      resolve(Math.round(totalCalories));
    });
  });
}

// Get heart rate data
export function getHeartRateData(startDate: string, endDate: string): Promise<HealthValue[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([]);

  const options = {
    startDate,
    endDate,
    ascending: false,
    limit: 100,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getHeartRateSamples(options, (error, results) => {
      if (error) {
        console.error('Error getting heart rate data:', error);
        resolve([]);
        return;
      }
      resolve(results || []);
    });
  });
}

// Get sleep analysis data
export function getSleepAnalysis(startDate: string, endDate: string): Promise<any[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([]);

  const options = {
    startDate,
    endDate,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples(options, (error, results) => {
      if (error) {
        console.error('Error getting sleep data:', error);
        resolve([]);
        return;
      }
      resolve(results || []);
    });
  });
}

// Sync health data
export async function syncHealthData(userId: string, date: string): Promise<void> {
  if (!userId || !isHealthKitAvailable()) return;
  
  try {
    const enabled = await isHealthKitEnabled();
    if (!enabled) return;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startDateString = startOfDay.toISOString();
    const endDateString = endOfDay.toISOString();
    
    // Fetch all health metrics in parallel
    const [
      steps,
      calories,
      heartRateData,
      sleepData
    ] = await Promise.all([
      getStepCount(date),
      getActiveEnergyBurned(startDateString, endDateString),
      getHeartRateData(startDateString, endDateString),
      getSleepAnalysis(startDateString, endDateString)
    ]);

    // Calculate derived metrics
    const avgHeartRate = heartRateData.length > 0
      ? Math.round(heartRateData.reduce((sum, item) => sum + item.value, 0) / heartRateData.length)
      : null;

    const totalSleepMinutes = sleepData.reduce((total, item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return total + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);

    // Prepare the activity data
    const activityData = {
      user_id: userId,
      date,
      source: 'healthkit',
      steps,
      calories,
      avg_heart_rate: avgHeartRate,
      sleep_minutes: Math.round(totalSleepMinutes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update the database
    const { error } = await supabase
      .from('activities')
      .upsert(activityData);

    if (error) throw new Error(`Error updating health data: ${error.message}`);

    // Update last sync time
    await AsyncStorage.setItem(HEALTHKIT_LAST_SYNC_KEY, new Date().toISOString());

  } catch (error) {
    console.error('Error syncing health data:', error);
    throw error;
  }
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