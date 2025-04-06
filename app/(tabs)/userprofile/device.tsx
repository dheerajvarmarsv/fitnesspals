import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

type DeviceInfo = {
  type: 'smartwatch' | 'tracker' | 'other';
  name: string;
  icon: string;
  platform: 'ios' | 'android' | 'all';
};

const DEVICES: DeviceInfo[] = [
  {
    type: 'smartwatch',
    name: 'Smart Watch',
    icon: 'https://cdn-icons-png.flaticon.com/128/831/831515.png',
    platform: 'all',
  },
  {
    type: 'tracker',
    name: 'Activity Tracker',
    icon: 'https://cdn-icons-png.flaticon.com/128/2702/2702154.png',
    platform: 'all',
  },
  {
    type: 'other',
    name: 'Other Device',
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
          Connect your device to enhance your experience with the app.
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
                <Text style={styles.deviceDescription}>
                  Connect your {device.name.toLowerCase()} to the app
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          ))}
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceDescription: {
    fontSize: 14,
    color: '#666',
  },
});