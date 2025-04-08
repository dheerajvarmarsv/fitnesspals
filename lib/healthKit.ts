import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
  HealthInputOptions,
} from 'react-native-health';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const HEALTHKIT_ENABLED_KEY = 'healthkit_enabled';
const HEALTHKIT_LAST_SYNC_KEY = 'healthkit_last_sync';

// Type definition
export interface HealthKitStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  permissions: {
    steps: boolean;
    calories: boolean;
  };
}

// Get current status of HealthKit permissions
export async function getHealthKitStatus(): Promise<HealthKitStatus> {
  if (Platform.OS !== 'ios') {
    return {
      isAvailable: false,
      isAuthorized: false,
      permissions: {
        steps: false,
        calories: false,
      },
    };
  }

  let isEnabled = false;
  try {
    const storedValue = await AsyncStorage.getItem(HEALTHKIT_ENABLED_KEY);
    isEnabled = storedValue === 'true';
  } catch (error) {
    console.error('Error checking healthkit status:', error);
  }

  if (!isEnabled) {
    return {
      isAvailable: true,
      isAuthorized: false,
      permissions: {
        steps: false,
        calories: false,
      },
    };
  }

  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((error: Object, available: boolean) => {
      if (!available) {
        resolve({
          isAvailable: false,
          isAuthorized: false,
          permissions: {
            steps: false,
            calories: false,
          },
        });
        return;
      }

      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.StepCount,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          ],
          write: [],
        },
      } as HealthKitPermissions;

      AppleHealthKit.getAuthStatus(permissions, (err, result) => {
        if (err) {
          resolve({
            isAvailable: true,
            isAuthorized: false,
            permissions: {
              steps: false,
              calories: false,
            },
          });
          return;
        }

        // Check permissions status (SharingAuthorized = 2)
        const stepsAuthorized = result.permissions.read[0] === 2;
        const caloriesAuthorized = result.permissions.read[1] === 2;

        resolve({
          isAvailable: true,
          isAuthorized: stepsAuthorized || caloriesAuthorized,
          permissions: {
            steps: stepsAuthorized,
            calories: caloriesAuthorized,
          },
        });
      });
    });
  });
}

// Initialize HealthKit with the required permissions
export function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(false);
  }

  const permissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.StepCount,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      ],
      write: [],
    },
  } as HealthKitPermissions;

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        console.log('Error initializing HealthKit:', error);
        resolve(false);
        return;
      }
      
      // Save that HealthKit is enabled
      AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'true');
      resolve(true);
    });
  });
}

// Disable HealthKit integration
export async function disableHealthKit(): Promise<void> {
  await AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'false');
}

// Check if HealthKit is enabled in user preferences
export async function isHealthKitEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
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

// Get the user's step count for a specific day
export function getStepCount(date: string): Promise<number> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(0);
  }

  const options = {
    date: date,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(options, (error: string, results: HealthValue) => {
      if (error) {
        console.log('Error getting step count:', error);
        resolve(0);
        return;
      }
      
      resolve(results.value);
    });
  });
}

// Get active energy burned for a time period
export function getActiveEnergyBurned(startDate: string, endDate: string): Promise<number> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(0);
  }

  const options = {
    startDate,
    endDate,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error: string, results: HealthValue[]) => {
      if (error) {
        console.log('Error getting active energy burned:', error);
        resolve(0);
        return;
      }
      
      // Sum up all calories burned in this period
      const totalCalories = results.reduce((sum, item) => sum + item.value, 0);
      resolve(totalCalories);
    });
  });
}

// Set up background observers for step count and active energy burned
export function setupBackgroundObservers(userId: string): void {
  if (Platform.OS !== 'ios') {
    return;
  }

  // This is handled in AppDelegate.m but we also need to listen for events
  const { NativeEventEmitter, NativeModules } = require('react-native');
  const healthKitEmitter = new NativeEventEmitter(NativeModules.AppleHealthKit);
  
  // Listen for step count updates
  healthKitEmitter.addListener('healthKit:StepCount:new', async () => {
    const today = new Date().toISOString().split('T')[0];
    await syncHealthData(userId, today);
  });
  
  // Listen for active energy updates
  healthKitEmitter.addListener('healthKit:ActiveEnergyBurned:new', async () => {
    const today = new Date().toISOString().split('T')[0];
    await syncHealthData(userId, today);
  });
}

// Sync health data for a specific day
export async function syncHealthData(userId: string, date: string): Promise<void> {
  if (!userId || Platform.OS !== 'ios') {
    return;
  }
  
  try {
    // Check if HealthKit is enabled
    const enabled = await isHealthKitEnabled();
    if (!enabled) {
      return;
    }
    
    // Get the step count for today
    const steps = await getStepCount(date);
    
    // Get the active energy burned for today
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const calories = await getActiveEnergyBurned(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
    
    // Find existing activities from HealthKit for this day
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('source', 'healthkit');
    
    // Check if we need to update steps
    if (steps > 0) {
      const stepsActivity = existingActivities?.find(a => a.type === 'Steps');
      
      if (stepsActivity) {
        // Update existing activity
        await supabase
          .from('activities')
          .update({
            calories: Math.round(steps * 0.05), // Rough estimation for calories per step
            updated_at: new Date().toISOString()
          })
          .eq('id', stepsActivity.id);
      } else {
        // Create new activity
        await supabase
          .from('activities')
          .insert({
            user_id: userId,
            type: 'Steps',
            duration: 0,
            distance: Math.round(steps * 0.0008 * 10) / 10, // Rough km conversion
            calories: Math.round(steps * 0.05),
            steps: steps,
            date: date,
            source: 'healthkit'
          });
      }
    }
    
    // Check if we need to update calories
    if (calories > 0) {
      const caloriesActivity = existingActivities?.find(a => a.type === 'Workout' && a.source === 'healthkit');
      
      if (caloriesActivity) {
        // Update existing activity
        await supabase
          .from('activities')
          .update({
            calories: Math.round(calories),
            updated_at: new Date().toISOString()
          })
          .eq('id', caloriesActivity.id);
      } else {
        // Create new activity
        await supabase
          .from('activities')
          .insert({
            user_id: userId,
            type: 'Workout',
            duration: 0,
            distance: 0,
            calories: Math.round(calories),
            steps: 0,
            date: date,
            source: 'healthkit'
          });
      }
    }
    
    // Update last sync time
    await AsyncStorage.setItem(HEALTHKIT_LAST_SYNC_KEY, new Date().toISOString());
    
  } catch (error) {
    console.error('Error syncing health data:', error);
  }
} 