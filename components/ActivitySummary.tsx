// components/ActivitySummary.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActivitySummaryProps {
  steps: number;
  distance: number;  // stored as kilometers in DB
  duration: number;  // stored as minutes in DB
  calories: number;
  useKilometers: boolean;
}

export default function ActivitySummary({
  steps,
  distance,
  duration,
  calories,
  useKilometers,
}: ActivitySummaryProps) {
  // Convert distance based on user preference
  const displayDistance = useKilometers
    ? `${distance.toFixed(2)} km`
    : `${(distance * 0.621371).toFixed(2)} mi`;

  // Convert duration from minutes to hours with 1 decimal place
  const durationInHours = (duration / 60).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Steps */}
      <View style={styles.statBox}>
        <Ionicons name="walk" size={20} color="#FF4B4B" style={styles.icon} />
        <Text style={styles.value}>{steps}</Text>
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
        <Text style={styles.value}>{calories}</Text>
        <Text style={styles.label}>cal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Styles remain unchanged
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    padding: 12,
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
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
});