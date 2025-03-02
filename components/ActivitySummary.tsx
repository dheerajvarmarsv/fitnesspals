// components/ActivitySummary.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActivitySummaryProps {
  steps: number;
  distance: number;  // stored as kilometers in DB
  duration: number;  // minutes
  calories: number;
  useKilometers: boolean;
}

export default function ActivitySummary({
  steps,
  distance,
  duration,
  calories,
  useKilometers
}: ActivitySummaryProps) {
  // Convert distance if needed
  const displayDistance = useKilometers
    ? `${distance.toFixed(2)} km`
    : `${(distance * 0.621371).toFixed(2)} mi`;

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
        <Text style={styles.value}>{duration}</Text>
        <Text style={styles.label}>min</Text>
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