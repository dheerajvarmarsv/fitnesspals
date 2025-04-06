// app/(tabs)/userprofile/fitness-connections.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function FitnessConnections() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Sign In Required</Text>
          <Text style={styles.description}>
            Please sign in to access activity tracking features.
          </Text>
          <Button
            onPress={() => router.push('/(auth)/sign-in' as any)}
            style={styles.button}
          >
            Sign In
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Activity Tracking</Text>
        <Text style={styles.description}>
          Track your daily activities manually to monitor your progress and participate in challenges.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Manual Activity Tracking</Text>
          <Text style={styles.cardDescription}>
            You can manually log your activities like steps, distance, and workouts to track your progress.
          </Text>
          <Button
            onPress={() => router.push('/(tabs)/activity-log' as any)}
            style={styles.button}
          >
            Log Activity
          </Button>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Your Progress</Text>
          <Text style={styles.cardDescription}>
            View your activity history and track your progress over time.
          </Text>
          <Button
            onPress={() => router.push('/(tabs)/activity-history' as any)}
            style={styles.button}
          >
            View History
          </Button>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});