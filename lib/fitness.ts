// lib/fitness.ts
import { supabase } from './supabase';
import { Platform } from 'react-native';

export type ActivitySource = 'manual' | 'healthkit';

export interface Activity {
  id: string;
  user_id: string;
  type: string;
  duration: number;
  distance: number;
  calories: number;
  steps: number;
  date: string;
  source: ActivitySource;
  created_at: string;
  updated_at: string;
}

// Function to save activity
export async function saveActivity(
  userId: string,
  activity: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Activity | null> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        user_id: userId,
        source: activity.source || 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving activity:', error);
    return null;
  }
}

// Function to get activities
export async function getActivities(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Activity[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting activities:', error);
    return [];
  }
}

// Function to update activity
export async function updateActivity(
  activityId: string,
  updates: Partial<Activity>
): Promise<Activity | null> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating activity:', error);
    return null;
  }
}

// Function to delete activity
export async function deleteActivity(activityId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
}

// Function to get fitness connection status
export async function getFitnessConnectionStatus(userId: string): Promise<any[]> {
  try {
    const result = [];
    
    // Check if iOS and HealthKit is available
    if (Platform.OS === 'ios') {
      const { isHealthKitEnabled } = await import('./healthKit');
      const healthKitEnabled = await isHealthKitEnabled();
      result.push({
        id: 'apple-health',
        name: 'Apple Health',
        connected: healthKitEnabled,
        platform: 'ios',
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting fitness connection status:', error);
    return [];
  }
}