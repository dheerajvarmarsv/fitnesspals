// components/FitnessDataCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useUserSettings } from '../lib/useDatabase';

export default function FitnessDataCard() {
  const navigation = useNavigation();
  const [userId, setUserId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Get user settings for unit preference
  const { settings } = useUserSettings(userId);
  const useKilometers = settings?.use_kilometers ?? true;
  
  React.useEffect(() => {
    // Get the current user ID
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    
    fetchUser();
  }, []);
  
  // Handle add activity button
  const handleAddActivity = () => {
    navigation.navigate('add-activity' as never);
  };
  
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Activity Tracking</Text>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          Track your activities manually to keep a record of your fitness journey.
        </Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddActivity}
        >
          <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
          <Text style={styles.addButtonText}>Add Activity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
});