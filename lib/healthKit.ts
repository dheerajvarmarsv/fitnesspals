import { Platform, NativeEventEmitter, NativeModules, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Only import AppleHealthKit on iOS to prevent errors on Android
let AppleHealthKit: any = null;

// Constants for permissions - hardcoded as fallback
const HEALTHKIT_PERMISSIONS = {
  StepCount: 'StepCount',
  ActiveEnergyBurned: 'ActiveEnergyBurned'
};

// Constants
const HEALTHKIT_ENABLED_KEY = 'healthkit_enabled';
const HEALTHKIT_LAST_SYNC_KEY = 'healthkit_last_sync';

// Lazy-load the AppleHealthKit module to ensure it's fully initialized
function getHealthKit() {
  if (AppleHealthKit === null && Platform.OS === 'ios') {
    try {
      // Dynamic import with direct access to module
      const RNHealth = require('react-native-health');
      AppleHealthKit = RNHealth.default;

      // Force initialize the module with empty options if needed
      if (AppleHealthKit && !AppleHealthKit.initHealthKit) {
        console.log('Health module needs initialization');
        
        // This is a workaround for simulator issues where the module isn't fully initialized
        InteractionManager.runAfterInteractions(() => {
          // Give the JS engine a moment to fully initialize the module
          setTimeout(() => {
            console.log('Re-initializing AppleHealthKit module');
            AppleHealthKit = require('react-native-health').default;
          }, 100);
        });
      }
    } catch (error) {
      console.error('Failed to import AppleHealthKit:', error);
      AppleHealthKit = null;
    }
  }
  return AppleHealthKit;
}

// Type definition
export interface HealthKitStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  permissions: {
    steps: boolean;
    calories: boolean;
  };
}

// Check if HealthKit is available on this device
export function isHealthKitAvailable(): boolean {
  // Make sure both the JS module and native module are available
  const healthKit = getHealthKit();
  const isAvailable = Platform.OS === 'ios' && 
                      healthKit !== null && 
                      NativeModules.AppleHealthKit !== undefined;
  
  console.log('HealthKit available:', isAvailable);
  return isAvailable;
}

// Safely get permissions constants
function getPermissions() {
  const healthKit = getHealthKit();
  try {
    if (!healthKit?.Constants?.Permissions) {
      console.warn('Using fallback permissions as AppleHealthKit.Constants.Permissions is not available');
      return HEALTHKIT_PERMISSIONS;
    }
    return healthKit.Constants.Permissions;
  } catch (e) {
    console.log('Error accessing permissions:', e);
    return HEALTHKIT_PERMISSIONS;
  }
}

// Get current status of HealthKit permissions
export async function getHealthKitStatus(): Promise<HealthKitStatus> {
  // Early return if not available
  if (!isHealthKitAvailable()) {
    console.log('HealthKit is not available on this device');
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
    console.log('HealthKit is available but not enabled in app settings');
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
    try {
      const healthKit = getHealthKit();
      if (!healthKit || typeof healthKit.isAvailable !== 'function') {
        console.error('HealthKit.isAvailable is not a function');
        resolve({
          isAvailable: false,
          isAuthorized: false,
          permissions: { steps: false, calories: false },
        });
        return;
      }

      healthKit.isAvailable((error: Object, available: boolean) => {
        if (error) {
          console.error('Error checking if HealthKit is available:', error);
          resolve({
            isAvailable: false,
            isAuthorized: false,
            permissions: { steps: false, calories: false },
          });
          return;
        }
        
        if (!available) {
          console.log('HealthKit is not available according to isAvailable method');
          resolve({
            isAvailable: false,
            isAuthorized: false,
            permissions: { steps: false, calories: false },
          });
          return;
        }

        try {
          // Get permissions in a safe way
          const permissionsList = getPermissions();
          
          const permissions = {
            permissions: {
              read: [
                permissionsList.StepCount,
                permissionsList.ActiveEnergyBurned,
              ],
              write: [],
            },
          };

          if (!healthKit.getAuthStatus) {
            console.error('HealthKit.getAuthStatus is not a function');
            resolve({
              isAvailable: true,
              isAuthorized: false,
              permissions: { steps: false, calories: false },
            });
            return;
          }

          healthKit.getAuthStatus(permissions, (err: any, result: any) => {
            if (err) {
              console.error('Error getting auth status:', err);
              resolve({
                isAvailable: true,
                isAuthorized: false,
                permissions: { steps: false, calories: false },
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
        } catch (error) {
          console.error('Error in getAuthStatus:', error);
          resolve({
            isAvailable: true,
            isAuthorized: false,
            permissions: { steps: false, calories: false },
          });
        }
      });
    } catch (error) {
      console.error('Error checking HealthKit availability:', error);
      resolve({
        isAvailable: false,
        isAuthorized: false,
        permissions: { steps: false, calories: false },
      });
    }
  });
}

// Initialize HealthKit with the required permissions
export function initHealthKit(): Promise<boolean> {
  // Double-check that HealthKit is available before trying to initialize
  if (!isHealthKitAvailable()) {
    console.log('HealthKit is not available, cannot initialize');
    return Promise.resolve(false);
  }

  const healthKit = getHealthKit();
  
  // Re-require the module as a last resort if initHealthKit is missing
  if (!healthKit || typeof healthKit.initHealthKit !== 'function') {
    console.error('AppleHealthKit.initHealthKit is not a function');
    
    // Last attempt to get a fresh instance
    try {
      console.log('Attempting to reload the health module...');
      // Force re-import
      delete require.cache[require.resolve('react-native-health')];
      const freshModule = require('react-native-health').default;
      AppleHealthKit = freshModule;
      
      // If still not working, give up
      if (!AppleHealthKit || typeof AppleHealthKit.initHealthKit !== 'function') {
        console.error('Still not able to access initHealthKit after reload');
        return Promise.resolve(false);
      }
    } catch (e) {
      console.error('Error reloading health module:', e);
      return Promise.resolve(false);
    }
  }

  try {
    // Get permissions in a safe way
    const permissionsList = getPermissions();
    
    const permissions = {
      permissions: {
        read: [
          permissionsList.StepCount,
          permissionsList.ActiveEnergyBurned,
        ],
        write: [],
      },
    };

    console.log('Initializing HealthKit with permissions:', permissions);

    return new Promise((resolve) => {
      healthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.log('Error initializing HealthKit:', error);
          resolve(false);
          return;
        }
        
        console.log('HealthKit initialized successfully');
        
        // Save that HealthKit is enabled
        AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'true')
          .then(() => resolve(true))
          .catch((error) => {
            console.error('Error saving HealthKit status:', error);
            resolve(false);
          });
      });
    });
  } catch (error) {
    console.error('Exception in initHealthKit:', error);
    return Promise.resolve(false);
  }
}

// Disable HealthKit integration
export async function disableHealthKit(): Promise<void> {
  await AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'false');
}

// Check if HealthKit is enabled in user preferences
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

// Get the user's step count for a specific day
export function getStepCount(date: string): Promise<number> {
  if (!isHealthKitAvailable()) {
    return Promise.resolve(0);
  }

  const healthKit = getHealthKit();
  const options = {
    date: date,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    healthKit.getStepCount(options, (error: string, results: any) => {
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
  if (!isHealthKitAvailable()) {
    return Promise.resolve(0);
  }

  const healthKit = getHealthKit();
  const options = {
    startDate,
    endDate,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    healthKit.getActiveEnergyBurned(options, (error: string, results: any) => {
      if (error) {
        console.log('Error getting active energy burned:', error);
        resolve(0);
        return;
      }
      
      // Sum up all calories burned in this period
      const totalCalories = results.reduce((sum: number, item: any) => sum + item.value, 0);
      resolve(totalCalories);
    });
  });
}

// Set up background observers for step count and active energy burned
export function setupBackgroundObservers(userId: string): void {
  if (!isHealthKitAvailable()) {
    return;
  }

  // This is handled in AppDelegate.m but we also need to listen for events
  try {
    const healthKitEmitter = new NativeEventEmitter(NativeModules.AppleHealthKit);
    
    // Listen for step count updates
    healthKitEmitter.addListener('healthKit:StepCount:new', async () => {
      console.log('Received HealthKit step count update');
      const today = new Date().toISOString().split('T')[0];
      await syncHealthData(userId, today);
    });
    
    // Listen for active energy updates
    healthKitEmitter.addListener('healthKit:ActiveEnergyBurned:new', async () => {
      console.log('Received HealthKit active energy update');
      const today = new Date().toISOString().split('T')[0];
      await syncHealthData(userId, today);
    });
  } catch (error) {
    console.error('Error setting up HealthKit observers:', error);
  }
}

// Sync health data for a specific day
export async function syncHealthData(userId: string, date: string): Promise<void> {
  if (!userId || !isHealthKitAvailable()) {
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
      const stepsActivity = existingActivities?.find((a: any) => a.type === 'Steps');
      
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
      const caloriesActivity = existingActivities?.find((a: any) => a.type === 'Workout' && a.source === 'healthkit');
      
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