// lib/fitness.ts
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ---------------------
// Types and Interfaces
// ---------------------

export type FitnessDataSource = 'manual' | 'apple_health' | 'google_fit';

export interface FitnessConnection {
  id: string;
  user_id: string;
  source: FitnessDataSource;
  is_connected: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyFitnessData {
  id: string;
  user_id: string;
  date: string;
  steps: number;
  distance: number;
  duration: number;
  calories: number;
  source: FitnessDataSource;
  created_at: string;
  updated_at: string;
}

// ---------------------
// Database Functions
// ---------------------

// Function to save fitness connection status
export async function saveFitnessConnection(
  userId: string,
  source: FitnessDataSource,
  isConnected: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('fitness_connections')
      .upsert({
        user_id: userId,
        source,
        is_connected: isConnected,
        last_sync: isConnected ? new Date().toISOString() : null,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving fitness connection:', error);
    throw error;
  }
}

// Function to fetch and store daily fitness data
export async function fetchAndStoreDailyFitnessData(
  userId: string,
  date: Date = new Date()
): Promise<void> {
  try {
    // Format date to YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];

    // Fetch existing data for the date
    const { data: existingData, error: fetchError } = await supabase
      .from('daily_fitness_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // For now, we'll just store manual data
    const fitnessData = {
      user_id: userId,
      date: dateStr,
      steps: 0,
      distance: 0,
      duration: 0,
      calories: 0,
      source: 'manual' as FitnessDataSource,
    };

    if (existingData) {
      // Update existing data
      const { error: updateError } = await supabase
        .from('daily_fitness_data')
        .update(fitnessData)
        .eq('id', existingData.id);

      if (updateError) throw updateError;
    } else {
      // Insert new data
      const { error: insertError } = await supabase
        .from('daily_fitness_data')
        .insert(fitnessData);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error storing daily fitness data:', error);
    throw error;
  }
}

// Function to get fitness connection status
export async function getFitnessConnectionStatus(
  userId: string
): Promise<FitnessConnection[]> {
  try {
    const { data, error } = await supabase
      .from('fitness_connections')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting fitness connection status:', error);
    throw error;
  }
}

// Function to get daily fitness data
export async function getDailyFitnessData(
  userId: string,
  date: Date = new Date()
): Promise<DailyFitnessData | null> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_fitness_data')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting daily fitness data:', error);
    throw error;
  }
}