// components/FitnessDataCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useHealthData from '../lib/useHealthData';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useUserSettings } from '../lib/useDatabase';

export default function FitnessDataCard() {
  const today = new Date();
  const { 
    steps, 
    distance, 
    duration, 
    calories, 
    loading, 
    error, 
    hasPermissions,
    refreshData
  } = useHealthData(today);
  
  const navigation = useNavigation();
  const [userId, setUserId] = React.useState<string | null>(null);
  
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
  
  // Convert distance from meters to km or miles
  const formattedDistance = () => {
    if (distance === 0) return '0';
    
    const distanceInKm = distance / 1000;
    
    if (useKilometers) {
      return distanceInKm.toFixed(2);
    } else {
      // Convert to miles
      const distanceInMiles = distanceInKm * 0.621371;
      return distanceInMiles.toFixed(2);
    }
  };
  
  // Format exercise duration
  const formattedDuration = () => {
    if (duration === 0) return '0 min';
    
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} min`;
    }
  };
  
  // Handle connect to health services
  const handleConnect = () => {
    // Navigate to fitness connections screen
    navigation.navigate('fitness-connections' as never);
  };
  
  // Handle refresh button
  const handleRefresh = async () => {
    await refreshData();
  };
  
  // Show different UI based on permission status
  const isSimulator = Platform.OS === 'ios' && (__DEV__ || process.env.NODE_ENV === 'development');
  
  if (!hasPermissions && Platform.OS !== 'web') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Fitness Data</Text>
        
        {isSimulator ? (
          // Special message for simulators
          <View>
            <Text style={styles.noPermission}>
              Health data is limited in simulators. For full functionality, please test on a physical device.
            </Text>
            <Text style={styles.simulatorNote}>
              You can still add activities manually using the button below.
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('add-activity' as never)}
            >
              <Text style={styles.addButtonText}>Add Activity Manually</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Regular connect message for real devices
          <View>
            <Text style={styles.noPermission}>
              Connect to health services to track your activity
            </Text>
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={handleConnect}
            >
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
  
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Fitness Data</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Fitness Data</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Activity</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#000" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="footsteps" size={24} color="#000" />
          </View>
          <Text style={styles.statValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="map" size={24} color="#000" />
          </View>
          <Text style={styles.statValue}>{formattedDistance()}</Text>
          <Text style={styles.statLabel}>{useKilometers ? 'Kilometers' : 'Miles'}</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={24} color="#000" />
          </View>
          <Text style={styles.statValue}>{formattedDuration()}</Text>
          <Text style={styles.statLabel}>Active Time</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Ionicons name="flame" size={24} color="#000" />
          </View>
          <Text style={styles.statValue}>{calories.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('add-activity' as never)}
      >
        <Text style={styles.addButtonText}>Add Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noPermission: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
    fontSize: 14,
  },
  simulatorNote: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  connectButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});