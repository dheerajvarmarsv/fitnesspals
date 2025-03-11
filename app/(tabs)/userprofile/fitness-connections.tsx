// app/(tabs)/userprofile/fitness-connections.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import FitnessConnections from '../../../components/FitnessConnections';

export default function FitnessConnectionsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Fitness Connections',
          headerStyle: {
            backgroundColor: '#4A90E2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      
      <FitnessConnections 
        onUpdate={() => {
          // Handle updates if needed
          console.log('Fitness connections updated');
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});