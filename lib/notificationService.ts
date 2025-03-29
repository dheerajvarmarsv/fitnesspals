// lib/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { logNotificationEvent } from './notificationDebug';
import { sendNotificationToUser } from './notificationServer';

interface NotificationDebugData {
  pushToken?: string | null;
  error?: string | null;
  payload?: any;
  response?: any;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Set up Android notification channels for different notification types
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('friend-requests', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('challenge-invites', {
      name: 'Challenge Invites',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

// Check if push notifications are available on this device
export async function isPushNotificationsAvailable() {
  // Must be a physical device (not simulator/emulator)
  if (!Device.isDevice) {
    console.log('Push notifications not available on simulator');
    return false;
  }

  // Must not be web platform
  if (Platform.OS === 'web') {
    console.log('Push notifications not available on web');
    return false;
  }

  // Must have projectId configured
  if (!Constants.expoConfig?.extra?.eas?.projectId) {
    console.error('Missing EAS project ID in app.config.ts');
    return false;
  }

  return true;
}

// Request permission to show notifications
export async function requestNotificationPermission() {
  if (!await isPushNotificationsAvailable()) {
    return false;
  }

  // Check existing permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    // Request permission if not already granted
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// Register for push notifications
export async function registerForPushNotifications() {
  try {
    console.log('Registering for push notifications...');
    
    await logNotificationEvent('registration_start', 'Starting push token registration process');
    
    // 1. Check device compatibility
    if (!await isPushNotificationsAvailable()) {
      await logNotificationEvent('registration_error', 'Device not compatible with push notifications');
      return null;
    }

    // 2. Request permission
    await logNotificationEvent('permission_request', 'Requesting notification permissions');
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      await logNotificationEvent('permission_denied', 'Permission denied for push notifications');
      return null;
    }
    
    await logNotificationEvent('permission_granted', 'Notification permissions granted');

    // 3. Set up notification channels for Android
    if (Platform.OS === 'android') {
      await logNotificationEvent('android_channels', 'Setting up Android notification channels');
      await setupNotificationChannels();
    }

    // 4. Get the push token from Expo
    const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    await logNotificationEvent('token_fetch', 'Fetching Expo push token', {
      payload: { projectId: expoProjectId }
    });
    
    if (!expoProjectId) {
      await logNotificationEvent('registration_error', 'Missing EAS project ID in app.config.ts');
      return null;
    }
    
    // Get the push token
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: expoProjectId,
    });

    await logNotificationEvent('token_received', 'Received Expo push token', {
      pushToken: pushToken.data
    });

    // 5. Save the token to the database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await logNotificationEvent('saving_token', 'Saving push token to database', {
        pushToken: pushToken.data
      });
      
      // First check if we already have the same token
      const { data: currentSettings, error: fetchError } = await supabase
        .from('profile_settings')
        .select('push_token, notifications_enabled')
        .eq('id', user.id)
        .single();
        
      if (fetchError) {
        await logNotificationEvent('db_fetch_error', 'Error fetching current settings', {
          error: fetchError.message
        });
      }
        
      // Only update if token changed or notifications are disabled
      if (currentSettings?.push_token !== pushToken.data || !currentSettings?.notifications_enabled) {
        const { error } = await supabase
          .from('profile_settings')
          .update({
            push_token: pushToken.data,
            notifications_enabled: true,
          })
          .eq('id', user.id);

        if (error) {
          await logNotificationEvent('db_update_error', 'Error saving push token to database', {
            error: error.message
          });
        } else {
          await logNotificationEvent('token_saved', 'Successfully saved token to database');
          
          // Create notification log entry for debugging
          try {
            await supabase
              .from('notification_logs')
              .insert({
                event_type: 'token_registration',
                recipient_id: user.id,
                sender_id: user.id,
                message: 'Push token registration',
                status: 'sent',
                details: JSON.stringify({ token: pushToken.data })
              });
              
            await logNotificationEvent('notification_log_created', 'Created notification log entry');
          } catch (logError: unknown) {
            const errorMessage = logError instanceof Error ? logError.message : String(logError);
            await logNotificationEvent('notification_log_error', 'Failed to create notification log', {
              error: errorMessage
            });
          }
        }
      } else {
        await logNotificationEvent('token_unchanged', 'Token already registered and notifications enabled');
      }
    } else {
      await logNotificationEvent('auth_error', 'No authenticated user found when saving token');
    }

    return pushToken.data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logNotificationEvent('registration_exception', 'Exception during registration', {
      error: errorMessage
    });
    console.error('Error registering for push notifications:', errorMessage);
    return null;
  }
}

// Unregister from push notifications
export async function unregisterFromPushNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, cannot unregister');
      return false;
    }

    const { error } = await supabase
      .from('profile_settings')
      .update({
        push_token: null,
        notifications_enabled: false,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error unregistering push notifications:', error);
      return false;
    }

    console.log('Successfully unregistered from push notifications');
    return true;
  } catch (error) {
    console.error('Error in unregisterFromPushNotifications:', error);
    return false;
  }
}

// Send a local test notification (for development testing)
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification',
      body: 'This is a test notification from the app',
      data: { screen: 'friends' },
      sound: true,
    },
    trigger: { seconds: 1 },
  });
  
  console.log('Scheduled a test notification');
  return true;
}

// Set up notification listeners
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  const receivedListener = onNotificationReceived
    ? Notifications.addNotificationReceivedListener(onNotificationReceived)
    : null;

  const responseListener = onNotificationResponse 
    ? Notifications.addNotificationResponseReceivedListener(onNotificationResponse)
    : null;

  // Return a cleanup function
  return () => {
    if (receivedListener) receivedListener.remove();
    if (responseListener) responseListener.remove();
  };
}

// Export the notification functions from notificationServer.ts for backward compatibility
export { sendFriendRequestNotification, sendChallengeInviteNotification } from './notificationServer';