import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HealthServicesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity Tracking</Text>
      <Text style={styles.description}>
        Track your activities manually by adding them through the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
}); 