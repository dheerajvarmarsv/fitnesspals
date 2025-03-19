// lib/fitness.ts
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ---------------------
// Existing Types and Interfaces
// ---------------------

// Supported fitness data sources
export type FitnessDataSource = 'manual' | 'google_fit' | 'apple_health' | 'fitbit' | 'health_connect' | 'other';

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';

// Interface for user fitness connections
export interface FitnessConnection {
  id: string;
  user_id: string;
  type: FitnessDataSource;
  connected: boolean;
  status: ConnectionStatus;
  last_synced: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_sync_count: number | null;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// Interface for synced fitness activities
export interface FitnessActivity {
  id: string;
  user_id: string;
  source: FitnessDataSource;
  activity_type: string;
  start_time: string;
  end_time: string;
  duration: number;
  distance: number | null;
  calories: number | null;
  heart_rate: number | null;
  created_at: string;
  updated_at: string;
}

// Interface for health data (duration is in minutes)
export interface HealthData {
  id?: string;
  user_id: string;
  source: FitnessDataSource;
  date: string;
  steps: number | null;
  distance: number | null;
  calories: number | null;
  heart_rate: number | null;
  sleep_minutes: number | null;
  created_at?: string;
  updated_at?: string;
}

// Activity data structure for converting from fitness services to our format
export interface ActivityData {
  activity_type: string;
  source: FitnessDataSource;
  start_time: string;
  end_time: string;
  duration: number; // minutes
  distance?: number;
  calories?: number;
  heart_rate?: number;
  steps?: number;
  sleep_minutes?: number;
  metadata?: any;
}

// ---------------------
// Existing Functions
// ---------------------

/**
 * Get the user's fitness connections.
 */
export async function getUserFitnessConnections(userId: string): Promise<FitnessConnection[]> {
  const { data, error } = await supabase
    .from('user_fitness_connections')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching fitness connections:', error);
    throw error;
  }
  return data || [];
}

/**
 * Create or update a fitness connection.
 */
export async function saveFitnessConnection(
  userId: string,
  connectionData: Partial<FitnessConnection>
): Promise<FitnessConnection> {
  const connection = {
    user_id: userId,
    type: connectionData.type as FitnessDataSource,
    connected: connectionData.connected || false,
    status: connectionData.status || 'disconnected',
    permissions: connectionData.permissions || [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_fitness_connections')
    .upsert([connection], { onConflict: 'user_id, type' })
    .select()
    .single();

  if (error) {
    console.error('Error saving fitness connection:', error);
    throw error;
  }
  return data;
}

/**
 * Update a fitness connection's sync status.
 */
export async function updateSyncStatus(
  connectionId: string,
  status: string,
  error?: string,
  count?: number
): Promise<void> {
  const updateData: any = {
    last_synced: new Date().toISOString(),
    last_sync_status: status,
    updated_at: new Date().toISOString(),
  };
  if (error) updateData.last_sync_error = error;
  if (count !== undefined) updateData.last_sync_count = count;

  const { error: updateError } = await supabase
    .from('user_fitness_connections')
    .update(updateData)
    .eq('id', connectionId);

  if (updateError) {
    console.error('Error updating sync status:', updateError);
    throw updateError;
  }
}
export async function saveHealthConnectionStatus(
  userId: string, 
  status: 'connected' | 'disconnected' | 'pending'
) {
  await supabase
    .from('user_health_connections')
    .upsert({
      user_id: userId,
      status,
      last_updated: new Date().toISOString()
    }, { onConflict: 'user_id' });
}
/**
 * Save fitness activities from external source and update challenges.
 */
export async function saveFitnessActivities(
  userId: string,
  activities: ActivityData[],
  source: FitnessDataSource
): Promise<{ savedCount: number; errors: any[] }> {
  const errors: any[] = [];
  let savedCount = 0;

  try {
    for (let i = 0; i < activities.length; i += 10) {
      const batch = activities.slice(i, i + 10);
      const internalActivities = batch.map(activity => {
        const internalActivity: any = {
          user_id: userId,
          activity_type: activity.activity_type,
          source: source,
          created_at: new Date().toISOString(),
          notes: `Imported from ${source}`,
        };
        if (activity.distance) {
          internalActivity.metric = 'distance_km';
          internalActivity.distance = activity.distance;
        } else if (activity.steps) {
          internalActivity.metric = 'steps';
          internalActivity.steps = activity.steps;
        } else if (activity.sleep_minutes) {
          internalActivity.metric = 'time';
          internalActivity.duration = activity.sleep_minutes;
          internalActivity.activity_type = 'Sleep';
        } else if (activity.calories) {
          internalActivity.metric = 'calories';
          internalActivity.calories = activity.calories;
        } else {
          internalActivity.metric = 'time';
          internalActivity.duration = activity.duration;
        }
        return internalActivity;
      });

      const { data, error } = await supabase
        .from('activities')
        .insert(internalActivities)
        .select('id');

      if (error) {
        console.error('Error saving batch of activities:', error);
        errors.push(error);
      } else {
        savedCount += data.length;
        for (const activityId of data.map((a: any) => a.id)) {
          try {
            const { updateChallengesWithActivity } = await import('./challengeUtils');
            await updateChallengesWithActivity(activityId, userId);
          } catch (err) {
            console.error('Error updating challenges with activity:', err);
            errors.push(err);
          }
        }
      }
    }
    return { savedCount, errors };
  } catch (error) {
    console.error('Error in saveFitnessActivities:', error);
    throw error;
  }
}

/**
 * Save a fitness connection token (should be encrypted in production).
 */
export async function saveFitnessToken(
  userId: string, 
  source: FitnessDataSource, 
  token: string
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      settings: { [`${source}_token`]: token },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving fitness token:', error);
    throw error;
  }
}

/**
 * Get a fitness connection token.
 */
export async function getFitnessToken(
  userId: string,
  source: FitnessDataSource
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching fitness token:', error);
    return null;
  }
  return data?.settings?.[`${source}_token`] || null;
}

/**
 * Generate a user-friendly description of an activity.
 */
export function formatActivityDescription(activity: any): string {
  let description = activity.activity_type;
  if (activity.metric === 'distance_km' && activity.distance) {
    description += `: ${activity.distance.toFixed(2)} km`;
  } else if (activity.metric === 'time' && activity.duration) {
    const hours = Math.floor(activity.duration / 60);
    const minutes = Math.round(activity.duration % 60);
    description += `: ${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  } else if (activity.metric === 'steps' && activity.steps) {
    description += `: ${activity.steps.toLocaleString()} steps`;
  } else if (activity.metric === 'calories' && activity.calories) {
    description += `: ${activity.calories} calories`;
  }
  return description;
}

/**
 * Disconnect a fitness source.
 */
export async function disconnectFitnessSource(
  userId: string,
  source: FitnessDataSource
): Promise<void> {
  const { error } = await supabase
    .from('user_fitness_connections')
    .update({
      connected: false,
      status: 'disconnected',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('type', source);

  if (error) {
    console.error('Error disconnecting fitness source:', error);
    throw error;
  }
}

// ------------------------------------------------------------------------
// NEW: Health Data Integration (Apple HealthKit & Android Health Connect)
// ------------------------------------------------------------------------

// 1) iOS HealthKit Integration
import AppleHealthKit, {
  HealthKitPermissions,
  HealthInputOptions,
} from 'react-native-health';

const { Permissions: HKPermissions } = AppleHealthKit.Constants;

const healthKitPermissions: HealthKitPermissions = {
  permissions: {
    read: [
      HKPermissions.Steps,
      HKPermissions.DistanceWalkingRunning,
      HKPermissions.ActiveEnergyBurned,
      HKPermissions.AppleExerciseTime,
    ],
    write: [],
  },
};

let healthKitInitialized = false;
export async function initHealthKit(): Promise<boolean> {
  if (healthKitInitialized || Platform.OS !== 'ios') return healthKitInitialized;
  return new Promise<boolean>((resolve) => {
    AppleHealthKit.initHealthKit(healthKitPermissions, (err) => {
      if (err) {
        console.error('Error initializing HealthKit:', err);
        return resolve(false);
      }
      healthKitInitialized = true;
      resolve(true);
    });
  });
}

export async function fetchAppleHealthData(date: Date): Promise<{
  steps: number;
  distance: number;
  duration: number;
  calories: number;
}> {
  const isInit = await initHealthKit();
  if (!isInit) return { steps: 0, distance: 0, duration: 0, calories: 0 };

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const options: HealthInputOptions = {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
    includeManuallyAdded: true,
  };

  try {
    const [steps, distance, calories, exerciseMinutes] = await Promise.all([
      new Promise<number>((resolve) => {
        AppleHealthKit.getStepCount(options, (err, result) => {
          if (err || !result) return resolve(0);
          resolve(result.value || 0);
        });
      }),
      new Promise<number>((resolve) => {
        AppleHealthKit.getDistanceWalkingRunning(options, (err, result) => {
          if (err || !result) return resolve(0);
          resolve(result.value || 0);
        });
      }),
      new Promise<number>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(options, (err, result) => {
          if (err || !result) return resolve(0);
          resolve(result.value || 0);
        });
      }),
      new Promise<number>((resolve) => {
        AppleHealthKit.getAppleExerciseTime(options, (err, result) => {
          if (err || !result) return resolve(0);
          resolve(result.value || 0);
        });
      }),
    ]);
    return { steps, distance, duration: exerciseMinutes, calories };
  } catch (error) {
    console.error('fetchAppleHealthData error:', error);
    return { steps: 0, distance: 0, duration: 0, calories: 0 };
  }
}

// 2) Android Health Connect Integration
let initHC: any;
let requestPermission: any;
let readRecords: any;
let TimeRangeFilter: any;

if (Platform.OS === 'android') {
  const rnhc = require('react-native-health-connect');
  initHC = rnhc.initialize;
  requestPermission = rnhc.requestPermission;
  readRecords = rnhc.readRecords;
  TimeRangeFilter = rnhc.TimeRangeFilter;
}

let androidInitialized = false;
let androidPermissions: any[] = [];

function hasAndroidPermission(recordType: string): boolean {
  return androidPermissions.some((perm) => perm.recordType === recordType);
}

export async function initAndroidHealth(): Promise<boolean> {
  if (androidInitialized || Platform.OS !== 'android') return androidInitialized;
  try {
    const isInitialized = await initHC();
    if (!isInitialized) {
      console.error('Failed to initialize Health Connect');
      return false;
    }
    androidPermissions = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Distance' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'ExerciseSession' },
    ]);
    androidInitialized = true;
    return true;
  } catch (error) {
    console.error('initAndroidHealth error:', error);
    return false;
  }
}

export async function fetchAndroidHealthData(date: Date): Promise<{
  steps: number;
  distance: number;
  duration: number;
  calories: number;
}> {
  if (Platform.OS !== 'android') return { steps: 0, distance: 0, duration: 0, calories: 0 };

  const isInit = await initAndroidHealth();
  if (!isInit) return { steps: 0, distance: 0, duration: 0, calories: 0 };

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const timeRangeFilter = {
    operator: 'between',
    startTime: startOfDay.toISOString(),
    endTime: endOfDay.toISOString(),
  };

  let steps = 0, distance = 0, calories = 0, duration = 0;
  try {
    if (hasAndroidPermission('Steps')) {
      const stepsData = await readRecords('Steps', { timeRangeFilter });
      steps = stepsData.reduce((sum: number, record: any) => sum + record.count, 0);
    }
    if (hasAndroidPermission('Distance')) {
      const distData = await readRecords('Distance', { timeRangeFilter });
      distance = distData.reduce((sum: number, record: any) => sum + record.distance.inMeters, 0);
    }
    if (hasAndroidPermission('ActiveCaloriesBurned')) {
      const calData = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      calories = calData.reduce((sum: number, record: any) => sum + record.energy.inKilocalories, 0);
    }
    if (hasAndroidPermission('ExerciseSession')) {
      const exerciseData = await readRecords('ExerciseSession', { timeRangeFilter });
      duration = exerciseData.reduce((sum: number, record: any) => {
        const start = new Date(record.startTime).getTime();
        const end = new Date(record.endTime).getTime();
        return sum + (end - start) / (1000 * 60);
      }, 0);
    }
  } catch (err) {
    console.error('fetchAndroidHealthData error:', err);
  }
  return { steps, distance, duration, calories };
}

// 3) Upsert Health Data into Supabase
async function upsertHealthData(
  userId: string,
  date: string,
  data: {
    steps?: number;
    distance?: number;
    duration?: number;
    calories?: number;
  },
  source: FitnessDataSource
) {
  try {
    const { error } = await supabase
      .from('health_data')
      .upsert(
        {
          user_id: userId,
          date,
          steps: data.steps ?? 0,
          distance: data.distance ?? 0,
          duration: data.duration ?? 0,
          calories: data.calories ?? 0,
          source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );
    if (error) {
      console.error('Error upserting health_data:', error);
    }
  } catch (err) {
    console.error('upsertHealthData exception:', err);
  }
}

// 4) Public Method: Fetch & Store Daily Health Data
export async function fetchAndStoreDailyHealthData(userId: string, date: Date): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];
  let data = { steps: 0, distance: 0, duration: 0, calories: 0 };
  let source: FitnessDataSource = 'manual';

  if (Platform.OS === 'ios') {
    data = await fetchAppleHealthData(date);
    source = 'apple_health';
  } else if (Platform.OS === 'android') {
    data = await fetchAndroidHealthData(date);
    source = 'health_connect';
  }
  await upsertHealthData(userId, dateStr, data, source);
}