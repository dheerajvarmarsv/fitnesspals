import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
  HealthObserver,
  HealthValue,
  HealthUnit,
} from 'react-native-health';
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

interface HealthData {
  steps: number;
  distance: number;
  calories: number;
}

// Define the permissions required for the app
const healthKitOptions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
  },
};

// Check if HealthKit is available on the device
export const isHealthKitAvailable = (): Promise<boolean> => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((err: string, available: boolean) => {
      if (err) {
        console.log('Error checking if HealthKit is available:', err);
        resolve(false);
      } else {
        resolve(available);
      }
    });
  });
};

// Initialize HealthKit
export const initHealthKit = async (): Promise<boolean> => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return false;
  }

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(healthKitOptions, (error: string, results: boolean) => {
      if (error) {
        console.error('Error initializing HealthKit:', error);
        resolve(false);
      } else {
        console.log('HealthKit initialized successfully');
        resolve(true);
      }
    });
  });
};

// Get HealthKit authorization status
export const getHealthKitAuthStatus = async (): Promise<any> => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return { authorized: false };
  }

  return new Promise((resolve) => {
    AppleHealthKit.getAuthStatus(healthKitOptions, (err: string, results: any) => {
      if (err) {
        console.error('Error getting authorization status:', err);
        resolve({ authorized: false });
      } else {
        resolve(results);
      }
    });
  });
};

// Setup step count observer
export const setupStepCountObserver = () => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    // Set up the observer
    AppleHealthKit.setObserver({
      type: AppleHealthKit.Constants.Observers.StepCount,
    });
    
    // Register event listener
    const eventEmitter = new NativeEventEmitter(NativeModules.AppleHealthKit);
    
    // When new step count data is available
    eventEmitter.addListener('healthKit:StepCount:new', async () => {
      console.log('New step count data received');
      await fetchHealthData();
    });

    // When active energy data is available
    eventEmitter.addListener('healthKit:ActiveEnergyBurned:new', async () => {
      console.log('New active energy data received');
      await fetchHealthData();
    });
  } catch (error) {
    console.error('Error setting up observers:', error);
  }
};

// Get today's step count
export const getStepCount = async (): Promise<number> => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return 0;
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      date: new Date().toISOString(),
    };

    AppleHealthKit.getStepCount(options, (err: string, results: HealthValue) => {
      if (err) {
        console.error('Error getting step count:', err);
        resolve(0);
      } else {
        resolve(results.value || 0);
      }
    });
  });
};

// Get today's distance walked/run
export const getDistanceWalkingRunning = async (): Promise<number> => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return 0;
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      date: new Date().toISOString(),
      unit: 'km',
    };

    AppleHealthKit.getDistanceWalkingRunning(options, (err: string, results: HealthValue) => {
      if (err) {
        console.error('Error getting distance:', err);
        resolve(0);
      } else {
        resolve(results.value || 0);
      }
    });
  });
};

// Get today's active calories burned
export const getActiveEnergyBurned = async (): Promise<number> => {
  // Only applicable for iOS
  if (Platform.OS !== 'ios') {
    return 0;
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      date: new Date().toISOString(),
    };

    AppleHealthKit.getActiveEnergyBurned(options, (err: string, results: any) => {
      if (err) {
        console.error('Error getting active energy burned:', err);
        resolve(0);
      } else {
        if (Array.isArray(results)) {
          const value = results.length > 0 ? results[0].value : 0;
          resolve(value);
        } else {
          resolve(results.value || 0);
        }
      }
    });
  });
};

// Fetch all health data at once
export const fetchHealthData = async (): Promise<HealthData> => {
  try {
    if (Platform.OS !== 'ios') {
      return { steps: 0, distance: 0, calories: 0 };
    }

    // Get HealthKit auth status first
    const authStatus = await getHealthKitAuthStatus();
    if (!authStatus.authorized) {
      return { steps: 0, distance: 0, calories: 0 };
    }

    // Fetch data in parallel
    const [steps, distance, calories] = await Promise.all([
      getStepCount(),
      getDistanceWalkingRunning(),
      getActiveEnergyBurned(),
    ]);

    const healthData = {
      steps: Math.round(steps),
      distance: parseFloat(distance.toFixed(2)),
      calories: Math.round(calories),
    };

    // Store the health data in the database 
    // for the currently logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await saveHealthData(user, healthData);
    }

    return healthData;
  } catch (error) {
    console.error('Error fetching health data:', error);
    return { steps: 0, distance: 0, calories: 0 };
  }
};

// Save health data to the database
export const saveHealthData = async (user: User, healthData: HealthData): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Check if we already have data for today
    const { data: existingData, error: fetchError } = await supabase
      .from('health_data')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingData) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('health_data')
        .update({
          steps: healthData.steps,
          distance: healthData.distance,
          calories: healthData.calories,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingData.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('health_data')
        .insert({
          user_id: user.id,
          date: today,
          steps: healthData.steps,
          distance: healthData.distance,
          calories: healthData.calories,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Update user_fitness_connections table
    await updateFitnessConnection(user.id);

  } catch (error) {
    console.error('Error saving health data:', error);
  }
};

// Update the user_fitness_connections table
const updateFitnessConnection = async (userId: string): Promise<void> => {
  try {
    // Check if we already have a connection record
    const { data: existingConnection, error: fetchError } = await supabase
      .from('user_fitness_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'apple_health')
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingConnection) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_fitness_connections')
        .update({
          connected: true,
          last_synced: new Date().toISOString(),
          last_sync_status: 'success',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('user_fitness_connections')
        .insert({
          user_id: userId,
          type: 'apple_health',
          connected: true,
          last_synced: new Date().toISOString(),
          permissions: ['steps', 'distance', 'calories'],
          source_id: 'apple_health',
          status: 'active',
          last_sync_status: 'success',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error updating fitness connection:', error);
  }
}; 