// lib/fitness.ts
import { Platform, NativeModules } from 'react-native';
import { supabase } from './supabase';

// ---------------------
// Types and Interfaces
// ---------------------

export type FitnessDataSource =
  | 'manual'
  // | 'google_fit'
  // | 'apple_health'
  // | 'fitbit'
  // | 'health_connect'
  | 'other';

export type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';

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
  duration?: number | null;
  created_at?: string;
  updated_at?: string;
}

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
// Database Functions
// ---------------------

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

export const saveFitnessConnection = async (
  userId: string,
  connectionData: {
    type: FitnessDataSource;
    connected: boolean;
    status: string;
    permissions: string[];
  }
): Promise<boolean> => {
  try {
    if (!userId) {
      console.error('Cannot save fitness connection: No user ID provided');
      throw new Error('User ID is required');
    }

    const connection = {
      user_id: userId,
      type: connectionData.type,
      connected: connectionData.connected,
      status: connectionData.status || 'disconnected',
      permissions: connectionData.permissions || [],
      updated_at: new Date().toISOString(),
    };

    console.log('Saving fitness connection:', connection);

    const { error } = await supabase
      .from('user_fitness_connections')
      .upsert([connection], {
        onConflict: 'user_id,type'
      });

    if (error) {
      console.error('Error saving fitness connection:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Exception in saveFitnessConnection:', error);
    throw error;
  }
};

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
            const { updateChallengesWithActivity } = await import('../lib/challengeUtils');
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

// Stub functions to maintain API compatibility
export async function fetchAndStoreDailyHealthData(userId: string, date: Date): Promise<void> {
  // This function now only handles manual data
  const dateStr = date.toISOString().split('T')[0];
  
  try {
    const { error } = await supabase
      .from('health_data')
      .upsert(
        {
          user_id: userId,
          date: dateStr,
          steps: 0,
          distance: 0,
          duration: 0,
          calories: 0,
          source: 'manual',
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,date'
        }
      );

    if (error) {
      console.error('Error upserting health_data:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to store health data:', error);
    throw error;
  }
}

export async function fetchHealthData(date: Date): Promise<HealthData | null> {
  // Return null or default data since health integrations are disabled
  return null;
}

export async function checkHealthPermissions(): Promise<boolean> {
  // Always return false since health integrations are disabled
  return false;
}

// Remove all HealthKit and Health Connect imports and implementations
/* Health integration code removed */