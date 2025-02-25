import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

type DeviceInfo = {
  type: 'apple' | 'google' | 'fitbit';
  name: string;
  icon: string;
  platform: 'ios' | 'android' | 'all';
};

const DEVICES: DeviceInfo[] = [
  {
    type: 'apple',
    name: 'Apple Health',
    icon: 'https://cdn-icons-png.flaticon.com/128/831/831515.png',
    platform: 'ios',
  },
  {
    type: 'google',
    name: 'Google Fit',
    icon: 'https://cdn-icons-png.flaticon.com/128/2702/2702154.png',
    platform: 'android',
  },
  {
    type: 'fitbit',
    name: 'Fitbit',
    icon: 'https://cdn-icons-png.flaticon.com/128/2702/2702134.png',
    platform: 'all',
  },
];

export default function DeviceConnection() {
  const { isOnline } = useUser();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (device: DeviceInfo) => {
    if (!isOnline) {
      setError('You need to be online to connect a device');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      // Simulate device connection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, you would:
      // 1. Request necessary permissions
      // 2. Initialize the appropriate SDK
      // 3. Handle OAuth flow if required
      // 4. Store connection tokens securely
      
      router.back();
    } catch (e: any) {
      console.error('Error connecting device:', e);
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SharedLayout style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Connect Device</Text>
        <Text style={styles.description}>
          Connect your fitness tracker to automatically sync your activities.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {DEVICES
          .filter(device => 
            device.platform === 'all' || 
            device.platform === Platform.OS
          )
          .map((device) => (
            <TouchableOpacity
              key={device.type}
              style={[
                styles.deviceOption,
                connecting && styles.deviceOptionDisabled,
              ]}
              onPress={() => handleConnect(device)}
              disabled={connecting}
            >
              <Image
                source={{ uri: device.icon }}
                style={styles.deviceIcon}
              />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceStatus}>
                  {connecting ? 'Connecting...' : 'Tap to connect'}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color="#666"
              />
            </TouchableOpacity>
          ))
        }
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceOptionDisabled: {
    opacity: 0.5,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 14,
    color: '#666',
  },
});