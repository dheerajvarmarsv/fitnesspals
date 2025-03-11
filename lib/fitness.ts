// lib/fitness.ts
import { supabase } from './supabase';

// Define the supported fitness data sources
export type FitnessDataSource = 'manual' | 'google_fit' | 'apple_health' | 'fitbit' | 'other';

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

// Interface for health data
export interface HealthData {
  id: string;
  user_id: string;
  source: FitnessDataSource;
  date: string;
  steps: number | null;
  distance: number | null;
  calories: number | null;
  heart_rate: number | null;
  sleep_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// Activity data structure for converting from fitness services to our format
export interface ActivityData {
  activity_type: string;
  source: FitnessDataSource;
  start_time: string;
  end_time: string;
  duration: number; // minutes
  distance?: number; // km
  calories?: number;
  heart_rate?: number;
  steps?: number;
  sleep_minutes?: number;
  metadata?: any;
}

/**
 * Get the user's fitness connections
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
 * Create or update a fitness connection
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
 * Update a fitness connection's sync status
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

  if (error) {
    updateData.last_sync_error = error;
  }

  if (count !== undefined) {
    updateData.last_sync_count = count;
  }

  const { error: updateError } = await supabase
    .from('user_fitness_connections')
    .update(updateData)
    .eq('id', connectionId);

  if (updateError) {
    console.error('Error updating sync status:', updateError);
    throw updateError;
  }
}

/**
 * Save fitness activities from external source and update challenges
 */
export async function saveFitnessActivities(
  userId: string,
  activities: ActivityData[],
  source: FitnessDataSource
): Promise<{ savedCount: number; errors: any[] }> {
  const errors: any[] = [];
  let savedCount = 0;

  try {
    // Process activities in small batches to prevent overloading
    for (let i = 0; i < activities.length; i += 10) {
      const batch = activities.slice(i, i + 10);
      
      // Convert fitness activities to our internal activities format
      const internalActivities = batch.map(activity => {
        // Basic fields common to all activities
        const internalActivity: any = {
          user_id: userId,
          activity_type: activity.activity_type,
          source: source, // Use the enum type value
          created_at: new Date().toISOString(),
          notes: `Imported from ${source}`,
        };

        // Map specific metrics based on activity type
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
          // Default to duration/time
          internalActivity.metric = 'time';
          internalActivity.duration = activity.duration;
        }

        return internalActivity;
      });

      // Save to activities table
      const { data, error } = await supabase
        .from('activities')
        .insert(internalActivities)
        .select('id');

      if (error) {
        console.error('Error saving batch of activities:', error);
        errors.push(error);
      } else {
        savedCount += data.length;

        // Process activities for challenge points
        for (const activityId of data.map(a => a.id)) {
          try {
            // Import is dynamic to avoid circular dependencies
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
 * Save a fitness connection token (should be encrypted in production)
 */
export async function saveFitnessToken(
  userId: string, 
  source: FitnessDataSource, 
  token: string
): Promise<void> {
  // In production, you would encrypt this token before storing it
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
 * Get a fitness connection token
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

  // In production, you would decrypt this token
  return data?.settings?.[`${source}_token`] || null;
}

/**
 * Generate a user-friendly description of an activity
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
 * Disconnect a fitness source
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