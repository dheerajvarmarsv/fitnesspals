// app/(tabs)/userprofile/fitness-connections.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Switch, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getHealthKitStatus, initHealthKit, disableHealthKit, syncHealthData, setupBackgroundObservers, isHealthKitAvailable } from '../../../lib/healthKit';

export default function FitnessConnections() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [healthKitStatus, setHealthKitStatus] = useState({ 
    isAvailable: false,
    isAuthorized: false,
    permissions: { steps: false, calories: false }
  });
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  // Check availability immediately, but keep in state to avoid re-renders
  const [healthKitIsAvailable, setHealthKitIsAvailable] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Initialize and check availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = isHealthKitAvailable();
        console.log("HealthKit available:", available);
        setHealthKitIsAvailable(available);
        if (available) {
          await checkHealthKitStatus();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking HealthKit availability:", error);
        setHealthKitIsAvailable(false);
        setIsLoading(false);
        setHasError(true);
      }
    };
    
    checkAvailability();
  }, []);

  const checkHealthKitStatus = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      const status = await getHealthKitStatus();
      console.log("HealthKit status:", status);
      setHealthKitStatus(status);
      setHealthKitEnabled(status.isAuthorized);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking HealthKit status:', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  const handleHealthKitToggle = async (value: boolean) => {
    if (!healthKitIsAvailable) {
      Alert.alert('Not Available', 'HealthKit is not available on this device.');
      return;
    }

    try {
      if (value) {
        setIsLoading(true);
        setHasError(false);
        
        console.log("Initializing HealthKit...");
        const success = await initHealthKit();
        console.log("HealthKit initialization result:", success);
        
        setIsLoading(false);
        
        if (success) {
          if (user) {
            console.log("Setting up background observers...");
            setupBackgroundObservers(user.id);
            
            console.log("Syncing health data...");
            const today = new Date().toISOString().split('T')[0];
            await syncHealthData(user.id, today);
          }
          
          await checkHealthKitStatus();
          Alert.alert(
            "Success",
            "Health data access has been enabled. Your activity data will now sync automatically."
          );
        } else {
          Alert.alert(
            "Permission Denied",
            "You need to allow access to health data in order to sync activities."
          );
        }
      } else {
        await disableHealthKit();
        await checkHealthKitStatus();
        Alert.alert(
          "Health Data Disabled",
          "Health data syncing has been disabled. Your activity data will no longer sync automatically."
        );
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error toggling HealthKit:", error);
      setHasError(true);
      Alert.alert(
        "Error",
        "There was a problem setting up the health data connection. Please try again."
      );
    }
  };

  const handleManualSync = async () => {
    if (!user || !healthKitIsAvailable) return;
    
    setIsSyncing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await syncHealthData(user.id, today);
      Alert.alert("Success", "Your health data has been synced successfully.");
    } catch (error) {
      console.error("Error syncing data:", error);
      Alert.alert("Error", "There was a problem syncing your health data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetry = () => {
    checkHealthKitStatus();
  };

  if (loading || isLoading) {
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
            Please sign in to access health tracking features.
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
        <Text style={styles.title}>Health Tracking</Text>
        <Text style={styles.description}>
          Connect to your device's health services to automatically track your activities.
        </Text>

        {Platform.OS === 'ios' && (
          <Card style={styles.card}>
            <View style={styles.connectionRow}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="apple" size={24} color="#000" />
              </View>
              <View style={styles.connectionInfo}>
                <Text style={styles.cardTitle}>Apple Health</Text>
                <Text style={styles.cardDescription}>
                  {hasError 
                    ? "There was a problem connecting to Apple Health" 
                    : healthKitIsAvailable 
                      ? "Sync steps, workouts, and calories with Apple Health" 
                      : "Apple Health is not available on this device"}
                </Text>
              </View>
              
              {hasError ? (
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={handleRetry}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              ) : (
                <Switch
                  value={healthKitEnabled}
                  onValueChange={handleHealthKitToggle}
                  trackColor={{ false: "#d1d1d1", true: "#81b0ff" }}
                  thumbColor={healthKitEnabled ? "#2196F3" : "#f4f3f4"}
                  disabled={!healthKitIsAvailable}
                />
              )}
            </View>

            {healthKitEnabled && healthKitIsAvailable && !hasError && (
              <View style={styles.permissionsContainer}>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionText}>Steps</Text>
                  <Ionicons 
                    name={healthKitStatus.permissions.steps ? "checkmark-circle" : "close-circle"} 
                    size={22} 
                    color={healthKitStatus.permissions.steps ? "#4CAF50" : "#F44336"} 
                  />
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionText}>Calories</Text>
                  <Ionicons 
                    name={healthKitStatus.permissions.calories ? "checkmark-circle" : "close-circle"} 
                    size={22} 
                    color={healthKitStatus.permissions.calories ? "#4CAF50" : "#F44336"} 
                  />
                </View>
                <TouchableOpacity 
                  style={styles.syncButton} 
                  onPress={handleManualSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.syncButtonText}>Sync Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {Platform.OS === 'android' && (
          <Card style={styles.card}>
            <View style={styles.connectionRow}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="google" size={24} color="#4285F4" />
              </View>
              <View style={styles.connectionInfo}>
                <Text style={styles.cardTitle}>Google Fit</Text>
                <Text style={styles.cardDescription}>
                  Google Fit integration is coming soon
                </Text>
              </View>
              <View style={styles.comingSoonTag}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Manual Activity Tracking</Text>
          <Text style={styles.cardDescription}>
            You can always log your activities manually even if you don't connect to health services.
          </Text>
          <Button
            onPress={() => router.push('/(tabs)/' as any)}
            style={styles.button}
          >
            Go to Activity Tracking
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
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  connectionInfo: {
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
  permissionsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  comingSoonTag: {
    backgroundColor: '#FFD54F',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5D4037',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
});