import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import * as NotificationServer from './notificationServer';

// Configure notifications to show alerts, play sounds, and set badges
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Check if device is eligible for push notifications
 */
export async function isPushNotificationsAvailable() {
  if (!Device.isDevice) {
    console.log('Push notifications not available on simulator/emulator');
    return false;
  }
  if (Platform.OS === 'web') {
    console.log('Push notifications not available on web');
    return false;
  }
  return true;
}

/**
 * Request permission to send notifications
 * @returns boolean indicating if permission was granted
 */
export async function requestNotificationPermissions() {
  if (!await isPushNotificationsAvailable()) {
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Set up Android notification channels
 */
export async function setupAndroidChannels() {
  if (Platform.OS === 'android') {
    // Friend requests channel
    await Notifications.setNotificationChannelAsync('friend-requests', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    // Challenge invites channel
    await Notifications.setNotificationChannelAsync('challenge-invites', {
      name: 'Challenge Invites',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    // Challenge activity channel
    await Notifications.setNotificationChannelAsync('challenge-activity', {
      name: 'Challenge Activity',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
    // Daily reminders channel
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * Register for push notifications
 * @returns token if successful, null otherwise
 */
export async function registerForPushNotifications() {
  try {
    // Check availability and request permissions
    if (!await isPushNotificationsAvailable()) {
      console.log('Push notifications not available on this device');
      return null;
    }
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted by user');
      return null;
    }

    // Set up Android channels
    await setupAndroidChannels();

    // Get push token with improved error handling
    let token;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      token = tokenData.data;
      console.log('Successfully obtained push token:', token);
    } catch (tokenError) {
      console.error('Error getting push token:', tokenError);
      return null;
    }

    // Save token and enable notifications in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const success = await saveTokenToDatabase(user.id, token);
      if (!success) {
        console.error('Failed to save token to database');
      } else {
        console.log('Successfully saved token to database');
      }
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Save token to database and enable notifications for the user
 */
async function saveTokenToDatabase(userId: string, token: string) {
  try {
    const { error: settingsError } = await supabase
      .from('profile_settings')
      .update({
        push_token: token,
        notifications_enabled: true
      })
      .eq('id', userId);

    if (settingsError) {
      console.error('Error updating profile settings:', settingsError);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Exception saving push token:', error);
    return false;
  }
}

/**
 * Clear token from database
 */
export async function unregisterFromPushNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('profile_settings')
      .update({ push_token: null })
      .eq('id', user.id);
    if (error) {
      console.error('Error clearing push token:', error);
    }
  } catch (error) {
    console.error('Exception unregistering push notifications:', error);
  }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleTestNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { screen: 'Home' },
    },
    trigger: { seconds: 2 },
  });
}

/**
 * Set up notification listeners
 * @param onNotificationReceived Callback for when notification is received
 * @param onNotificationResponseReceived Callback for when notification is tapped
 * @returns Cleanup function to remove listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponseReceived?: (response: Notifications.NotificationResponse) => void
) {
  const notificationReceivedListener = onNotificationReceived
    ? Notifications.addNotificationReceivedListener(onNotificationReceived)
    : null;
  const notificationResponseListener = onNotificationResponseReceived
    ? Notifications.addNotificationResponseReceivedListener(onNotificationResponseReceived)
    : null;
  return () => {
    if (notificationReceivedListener) {
      Notifications.removeNotificationSubscription(notificationReceivedListener);
    }
    if (notificationResponseListener) {
      Notifications.removeNotificationSubscription(notificationResponseListener);
    }
  };
}

// Re-export notification server functions for convenience
export const sendFriendRequestNotification = NotificationServer.sendFriendRequestNotification;
export const sendChallengeInviteNotification = NotificationServer.sendChallengeInviteNotification;
export const sendChallengeActivityNotification = NotificationServer.sendChallengeActivityNotification;
export const sendChallengeReminderNotification = NotificationServer.sendChallengeReminderNotification;