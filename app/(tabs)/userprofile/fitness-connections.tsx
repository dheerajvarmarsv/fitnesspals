// app/(tabs)/userprofile/health-services.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { getFitnessConnectionStatus } from '../../../lib/fitness';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function FitnessConnections() {
  const router = useRouter();
  const { user } = useAuth();
  const [connections, setConnections] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await getFitnessConnectionStatus(user!.id);
      setConnections(data);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

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
            onPress={() => router.push('/activity-log')}
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
            onPress={() => router.push('/activity-history')}
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