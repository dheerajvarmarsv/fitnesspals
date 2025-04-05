// lib/useHealthData.ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export function useHealthData(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    const loadLastSync = async () => {
      try {
        const { data, error } = await supabase
          .from('health_data')
          .select('updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error) throw error;
        setLastSync(data?.updated_at || null);
      } catch (err) {
        console.error('Error loading last sync:', err);
        setError('Failed to load sync status');
      }
    };

    loadLastSync();
  }, [userId]);

  const syncHealthData = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Manual data sync only - health integrations disabled
      const { error } = await supabase
        .from('health_data')
        .upsert({
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          source: 'manual',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error('Error syncing health data:', err);
      setError('Failed to sync health data');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    lastSync,
    syncHealthData
  };
}