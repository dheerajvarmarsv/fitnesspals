// lib/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
    
    // 1. Check device compatibility
    if (!await isPushNotificationsAvailable()) {
      console.log('Device not compatible with push notifications');
      return null;
    }

    // 2. Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Permission denied for push notifications');
      return null;
    }

    // 3. Set up notification channels for Android
    await setupNotificationChannels();

    // 4. Get the push token from Expo
    const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log('Using EAS project ID:', expoProjectId);
    
    if (!expoProjectId) {
      console.error('Missing EAS project ID in app.config.ts');
      return null;
    }
    
    // Force a new token to be generated
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: expoProjectId,
      devicePushToken: null, // Force a new token to be generated
    });

    console.log('Expo push token:', pushToken.data);

    // 5. Save the token to the database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // First check if we already have the same token
      const { data: currentSettings } = await supabase
        .from('profile_settings')
        .select('push_token, notifications_enabled')
        .eq('id', user.id)
        .single();
        
      // Only update if token changed or notifications are disabled
      if (currentSettings?.push_token !== pushToken.data || !currentSettings?.notifications_enabled) {
        console.log('Updating push token in the database');
        
        const { error } = await supabase
          .from('profile_settings')
          .update({
            push_token: pushToken.data,
            notifications_enabled: true,
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving push token to database:', error);
        } else {
          console.log('Saved push token to database');
          
          // Send a test notification log
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
            console.log('Created notification log for token registration');
          } catch (logError) {
            console.error('Failed to create notification log:', logError);
          }
        }
      } else {
        console.log('Token already registered and notifications enabled');
      }
    }

    return pushToken.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
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
// This ensures existing imports still work
export async function sendFriendRequestNotification(receiverId: string, senderNickname: string) {
  try {
    // Dynamically import to avoid circular dependencies
    const { sendFriendRequestNotification } = await import('./notificationServer');
    return sendFriendRequestNotification(receiverId, senderNickname);
  } catch (error) {
    console.error('Error in sendFriendRequestNotification:', error);
    return false;
  }
}

export async function sendChallengeInviteNotification(
  receiverId: string,
  senderNickname: string,
  challengeId: string,
  challengeName: string
) {
  try {
    // Dynamically import to avoid circular dependencies
    const { sendChallengeInviteNotification } = await import('./notificationServer');
    return sendChallengeInviteNotification(receiverId, senderNickname, challengeId, challengeName);
  } catch (error) {
    console.error('Error in sendChallengeInviteNotification:', error);
    return false;
  }
}