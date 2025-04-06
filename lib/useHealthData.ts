// lib/useHealthData.ts
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { DailyFitnessData } from './fitness';

export function useHealthData(userId: string, date: Date = new Date()) {
  const [data, setData] = useState<DailyFitnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: fitnessData, error: fetchError } = await supabase
          .from('daily_fitness_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', dateStr)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No data found for this date, create a new entry
            const { data: newData, error: insertError } = await supabase
              .from('daily_fitness_data')
              .insert({
                user_id: userId,
                date: dateStr,
                steps: 0,
                distance: 0,
                duration: 0,
                calories: 0,
                source: 'manual'
              })
              .select()
              .single();

            if (insertError) throw insertError;
            setData(newData);
          } else {
            throw fetchError;
          }
        } else {
          setData(fitnessData);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch fitness data'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, date]);

  return { data, loading, error };
}