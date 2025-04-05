import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { FitnessDataSource } from '../../../../lib/fitness';

export default function FitnessConnections() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('user_fitness_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      console.error('Error loading connections:', err);
      setError('Failed to load fitness connections');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading connections...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fitness Connections</Text>
      {connections.length === 0 ? (
        <Text style={styles.message}>No fitness connections found</Text>
      ) : (
        connections.map((connection) => (
          <View key={connection.id} style={styles.connectionItem}>
            <Text style={styles.connectionName}>{connection.type}</Text>
            <Text style={styles.connectionStatus}>
              Status: {connection.status}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  connectionItem: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 