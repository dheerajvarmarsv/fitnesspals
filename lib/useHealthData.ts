// lib/useHealthData.ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchAndStoreDailyHealthData } from '../lib/fitness';

const useHealthData = (date: Date = new Date()) => {
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0); // in meters
  const [duration, setDuration] = useState(0); // in minutes
  const [calories, setCalories] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasPermissions, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize health services based on platform
    const initializeHealthService = async () => {
      try {
        if (Platform.OS === 'ios') {
          try {
            const { initHealthKit } = await import('../lib/fitness');
            const success = await initHealthKit();
            console.log('HealthKit initialization result:', success);
            setHasPermission(success);
          } catch (error) {
            console.error('iOS HealthKit initialization error:', error);
            // Handle this gracefully - simulators often don't support HealthKit
            setHasPermission(false);
          }
        } else if (Platform.OS === 'android') {
          try {
            const { initAndroidHealth } = await import('../lib/fitness');
            const success = await initAndroidHealth();
            console.log('Android Health Connect initialization result:', success);
            setHasPermission(success);
          } catch (error) {
            console.error('Android Health Connect initialization error:', error);
            // Emulators often don't support Health Connect
            setHasPermission(false);
          }
        } else {
          // Web or unsupported platform
          console.log('Platform not supported for health services');
          setHasPermission(false);
        }
      } catch (e) {
        console.error('Error initializing health service:', e);
        setError('Failed to initialize health service');
        setHasPermission(false);
      }
    };

    initializeHealthService();
  }, []);

  useEffect(() => {
    if (!hasPermissions && Platform.OS !== 'web') {
      setLoading(false);
      return;
    }

    const fetchHealthData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Try to get data from our database first (cached)
        const dateStr = date.toISOString().split('T')[0];
        const { data: healthData, error: dbError } = await supabase
          .from('health_data')
          .select('steps, distance, calories, sleep_minutes, duration')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .single();

        let stepsValue = 0;
        let distanceValue = 0;
        let durationValue = 0;
        let caloriesValue = 0;

        if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error fetching health data from DB:', dbError);
        }

        if (healthData) {
          // Use data from database
          stepsValue = healthData.steps || 0;
          distanceValue = healthData.distance || 0;
          durationValue = healthData.duration || 0; // Use the duration field
          caloriesValue = healthData.calories || 0;
          
          // No need to fetch from device if we have data
          setSteps(stepsValue);
          setDistance(distanceValue);
          setDuration(durationValue);
          setCalories(caloriesValue);
          setLoading(false);
          return;
        }

        // Only fetch from device services if we're on a supported platform
        if (Platform.OS === 'ios') {
          const { fetchAppleHealthData } = await import('../lib/fitness');
          const iosData = await fetchAppleHealthData(date);
          stepsValue = iosData.steps || 0;
          distanceValue = iosData.distance || 0;
          durationValue = iosData.duration || 0;
          caloriesValue = iosData.calories || 0;
          
          // Store data in the database for future use
          await fetchAndStoreDailyHealthData(user.id, date);
        } else if (Platform.OS === 'android') {
          const { fetchAndroidHealthData } = await import('../lib/fitness');
          const androidData = await fetchAndroidHealthData(date);
          stepsValue = androidData.steps || 0;
          distanceValue = androidData.distance || 0;
          durationValue = androidData.duration || 0;
          caloriesValue = androidData.calories || 0;
          
          // Store data in the database for future use
          await fetchAndStoreDailyHealthData(user.id, date);
        }

        // Update state
        setSteps(stepsValue);
        setDistance(distanceValue);
        setDuration(durationValue);
        setCalories(caloriesValue);
      } catch (e) {
        console.error('Error fetching health data:', e);
        setError('Failed to fetch health data');
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, [hasPermissions, date]);

  // Function to refresh data on demand
  const refreshData = async () => {
    // Only attempt refresh if on a supported platform
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return { success: false, message: 'Platform not supported' };
    }
    
    // Check if user has permissions
    if (!hasPermissions) {
      return { success: false, message: 'No health permissions' };
    }
    
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Force fetch from health services
      let stepsValue = 0;
      let distanceValue = 0;
      let durationValue = 0;
      let caloriesValue = 0;
      
      if (Platform.OS === 'ios') {
        const { fetchAppleHealthData } = await import('../lib/fitness');
        const iosData = await fetchAppleHealthData(date);
        stepsValue = iosData.steps || 0;
        distanceValue = iosData.distance || 0;
        durationValue = iosData.duration || 0;
        caloriesValue = iosData.calories || 0;
      } else if (Platform.OS === 'android') {
        const { fetchAndroidHealthData } = await import('../lib/fitness');
        const androidData = await fetchAndroidHealthData(date);
        stepsValue = androidData.steps || 0;
        distanceValue = androidData.distance || 0;
        durationValue = androidData.duration || 0;
        caloriesValue = androidData.calories || 0;
      }
      
      // Store data in the database
      await fetchAndStoreDailyHealthData(user.id, date);
      
      // Update state
      setSteps(stepsValue);
      setDistance(distanceValue);
      setDuration(durationValue);
      setCalories(caloriesValue);
      
      return { success: true };
    } catch (e) {
      console.error('Error refreshing health data:', e);
      setError('Failed to refresh health data');
      return { success: false, message: 'Error refreshing data' };
    } finally {
      setLoading(false);
    }
  };

  return { 
    steps, 
    distance, 
    duration, 
    calories,
    loading,
    error,
    hasPermissions,
    refreshData
  };
};

export default useHealthData;