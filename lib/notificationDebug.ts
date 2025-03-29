import { supabase } from './supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

interface NotificationDebugData {
  pushToken?: string | null;
  error?: string | null;
  payload?: any;
  response?: any;
}

// Function to log notification events to Supabase
export async function logNotificationEvent(
  eventType: string,
  description: string,
  extraData: NotificationDebugData = {}
) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Collect device info
    const deviceInfo = {
      deviceName: Device.deviceName || 'unknown',
      deviceType: Device.deviceType || 'unknown',
      osName: Platform.OS,
      osVersion: Platform.Version,
      appVersion: Constants.expoConfig?.version || 'unknown',
      expoVersion: Constants.expoConfig?.sdkVersion || 'unknown',
      isDevice: Device.isDevice,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      buildType: Constants.appOwnership === 'expo' ? 'Expo' : 'Production',
    };

    // Store the debug entry
    const { error } = await supabase.from('notification_debug').insert({
      user_id: user.id,
      event_type: eventType,
      description,
      device_info: deviceInfo,
      push_token: extraData.pushToken,
      error: extraData.error,
      payload: extraData.payload,
      response: extraData.response
    });

    if (error) {
      console.error('Failed to log notification event:', error);
    }
  } catch (error) {
    console.error('Error in logNotificationEvent:', error);
  }
}