// components/ActivitySummary.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fetchHealthData } from '../lib/health';
import { useUser } from './UserContext';
import * as Device from 'expo-device';

interface ActivitySummaryProps {
  steps: number;
  distance: number;  // stored as kilometers in DB
  duration: number;  // stored as minutes in DB
  calories: number;
  useKilometers: boolean;
  showHealthData?: boolean; // Whether to show health data from HealthKit if available
}

export default function ActivitySummary({
  steps,
  distance,
  duration,
  calories,
  useKilometers,
  showHealthData = false,
}: ActivitySummaryProps) {
  const { user } = useUser();
  const [healthData, setHealthData] = useState<{
    steps: number | null;
    distance: number | null;
    calories: number | null;
  }>({
    steps: null,
    distance: null,
    calories: null,
  });
  const [loading, setLoading] = useState(false);
  const [isSimulator, setIsSimulator] = useState(false);

  useEffect(() => {
    // Check if we're on a simulator
    const checkDevice = async () => {
      setIsSimulator(!Device.isDevice);
    };
    checkDevice();
    
    if (showHealthData && Platform.OS === 'ios' && user) {
      loadHealthData();
    }
  }, [showHealthData, user]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      // If this is a simulator, we'll skip the HealthKit integration
      // but still show the UI for testing purposes
      if (isSimulator) {
        console.log('Running on simulator, using sample health data');
        // Use sample data on simulator
        setHealthData({
          steps: 5000,
          distance: 3.2, 
          calories: 250
        });
        return;
      }
      
      const data = await fetchHealthData();
      setHealthData({
        steps: data.steps > 0 ? data.steps : null,
        distance: data.distance > 0 ? data.distance : null,
        calories: data.calories > 0 ? data.calories : null,
      });
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert distance based on user preference
  const displayDistance = useKilometers
    ? `${(healthData.distance ?? distance).toFixed(2)} km`
    : `${((healthData.distance ?? distance) * 0.621371).toFixed(2)} mi`;

  // Convert duration from minutes to hours with 1 decimal place
  const durationInHours = (duration / 60).toFixed(1);

  // Use health data if available, otherwise use the passed in values
  const displaySteps = healthData.steps ?? steps;
  const displayCalories = healthData.calories ?? calories;

  const handleHealthConnect = () => {
    if (Platform.OS === 'ios') {
      router.push('/userprofile/health-connections' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Steps */}
      <View style={styles.statBox}>
        <Ionicons name="walk" size={20} color="#FF4B4B" style={styles.icon} />
        <Text style={styles.value}>{displaySteps}</Text>
        <Text style={styles.label}>steps</Text>
      </View>

      {/* Distance */}
      <View style={styles.statBox}>
        <Ionicons name="pin" size={20} color="#FF4B4B" style={styles.icon} />
        <Text style={styles.value}>{displayDistance}</Text>
        <Text style={styles.label}>distance</Text>
      </View>

      {/* Duration */}
      <View style={styles.statBox}>
        <Ionicons name="time" size={20} color="#FF4B4B" style={styles.icon} />
        <Text style={styles.value}>{durationInHours}</Text>
        <Text style={styles.label}>hours</Text>
      </View>

      {/* Calories */}
      <View style={styles.statBox}>
        <Ionicons name="flame" size={20} color="#FF4B4B" style={styles.icon} />
        <Text style={styles.value}>{displayCalories}</Text>
        <Text style={styles.label}>cal</Text>
      </View>

      {/* Health Connect Info */}
      {showHealthData && Platform.OS === 'ios' && (
        <TouchableOpacity 
          style={styles.healthConnectButton} 
          onPress={handleHealthConnect}
        >
          <Ionicons name="heart" size={14} color="#FF4B4B" />
          <Text style={styles.healthConnectText}>
            {healthData.steps || isSimulator ? 'Health Connected' : 'Connect Health'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    padding: 12,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    position: 'relative',
  },
  statBox: {
    alignItems: 'center',
    width: '25%',
  },
  icon: {
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  healthConnectButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthConnectText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
});