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

// Define available permission types
export interface HealthKitStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  permissions: {
    steps: boolean;
    calories: boolean;
  };
}

// Check if HealthKit is available
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios';
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

// Get detailed HealthKit status
export async function getHealthKitStatus(): Promise<HealthKitStatus> {
  if (!isHealthKitAvailable()) {
    return {
      isAvailable: false,
      isAuthorized: false,
      permissions: {
        steps: false,
        calories: false,
      },
    };
  }

  // Check if enabled in app settings
  const isEnabled = await isHealthKitEnabled();
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
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        ],
        write: [],
      },
    };

    AppleHealthKit.getAuthStatus(permissions, (error, result) => {
      if (error) {
        console.error('Error getting auth status:', error);
        resolve({
          isAvailable: true,
          isAuthorized: false,
          permissions: { steps: false, calories: false },
        });
        return;
      }

      // Check permissions status (2 = authorized)
      const hasStepsPermission = result.permissions.read[0] === 2;
      const hasCaloriesPermission = result.permissions.read[1] === 2;

      resolve({
        isAvailable: true,
        isAuthorized: hasStepsPermission || hasCaloriesPermission,
        permissions: {
          steps: hasStepsPermission,
          calories: hasCaloriesPermission,
        },
      });
    });
  });
}

// Initialize HealthKit with required permissions
export function initHealthKit(): Promise<boolean> {
  if (!isHealthKitAvailable()) {
    return Promise.resolve(false);
  }

  const permissions: HealthKitPermissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.StepCount,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      ],
      write: [],
    },
  };

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        console.error('Error initializing HealthKit:', error);
        resolve(false);
        return;
      }
      
      // Store that HealthKit is enabled
      AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'true')
        .then(() => resolve(true))
        .catch((error) => {
          console.error('Error saving HealthKit status:', error);
          resolve(false);
        });
    });
  });
}

// Disable HealthKit integration
export async function disableHealthKit(): Promise<void> {
  await AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, 'false');
}

// Set up background observers for HealthKit data changes
export function setupBackgroundObservers(userId: string): void {
  if (!isHealthKitAvailable()) {
    return;
  }

  console.log('Setting up HealthKit background observers for user:', userId);
  
  // No direct API to set up observers in JS, this is handled in AppDelegate.mm
}

// Get the step count for a specific day
export function getStepCount(date: string): Promise<number> {
  if (!isHealthKitAvailable()) {
    return Promise.resolve(0);
  }

  const options = {
    date: date,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(options, (error, results) => {
      if (error) {
        console.error('Error getting step count:', error);
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

  const options = {
    startDate,
    endDate,
    includeManuallyAdded: true,
  };

  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error, results: HealthValue[]) => {
      if (error) {
        console.error('Error getting active energy burned:', error);
        resolve(0);
        return;
      }
      
      // Sum up all calories burned in this period
      const totalCalories = results.reduce((sum, item) => sum + item.value, 0);
      resolve(totalCalories);
    });
  });
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
    
    console.log(`Syncing health data for ${date}: ${steps} steps, ${calories} calories`);
    
    // Find existing activities from HealthKit for this day
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'healthkit')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString());
    
    // Check if we need to update steps
    if (steps > 0) {
      const stepsActivity = existingActivities?.find((a: any) => a.activity_type === 'Steps');
      
      if (stepsActivity) {
        // Update existing activity
        await supabase
          .from('activities')
          .update({
            steps: steps,
            distance: Math.round(steps * 0.0008 * 10) / 10, // Rough km conversion
            calories: Math.round(steps * 0.05), // Rough estimation for calories per step
            updated_at: new Date().toISOString()
          })
          .eq('id', stepsActivity.id);
          
        console.log('Updated existing steps activity');
      } else {
        // Create new activity
        await supabase
          .from('activities')
          .insert({
            user_id: userId,
            activity_type: 'Steps',
            duration: 0,
            distance: Math.round(steps * 0.0008 * 10) / 10, // Rough km conversion
            calories: Math.round(steps * 0.05),
            steps: steps,
            count: 0,
            notes: 'Imported from Apple Health',
            metric: 'steps',
            source: 'healthkit',
            created_at: new Date().toISOString()
          });
          
        console.log('Created new steps activity');
      }
    }
    
    // Check if we need to update calories
    if (calories > 0) {
      const caloriesActivity = existingActivities?.find((a: any) => 
        a.activity_type === 'Workout' && a.source === 'healthkit');
      
      if (caloriesActivity) {
        // Update existing activity
        await supabase
          .from('activities')
          .update({
            calories: Math.round(calories),
            updated_at: new Date().toISOString()
          })
          .eq('id', caloriesActivity.id);
          
        console.log('Updated existing calories activity');
      } else {
        // Create new activity
        await supabase
          .from('activities')
          .insert({
            user_id: userId,
            activity_type: 'Workout',
            duration: 0,
            distance: 0,
            calories: Math.round(calories),
            steps: 0,
            count: 0,
            notes: 'Active calories from Apple Health',
            metric: 'calories',
            source: 'healthkit',
            created_at: new Date().toISOString()
          });
          
        console.log('Created new calories activity');
      }
    }
    
    // Update last sync time
    await AsyncStorage.setItem(HEALTHKIT_LAST_SYNC_KEY, new Date().toISOString());
    
  } catch (error) {
    console.error('Error syncing health data:', error);
  }
}