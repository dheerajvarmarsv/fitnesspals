// lib/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { sendNotificationToUser } from './notificationServer';

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
    // Check if push notifications are available
    if (!await isPushNotificationsAvailable()) {
      return null;
    }

    // Request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.log('Permission not granted for push notifications');
      return null;
    }

    // Get push token
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // Set up notification channels for Android
    await setupNotificationChannels();

    // Store token in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profile_settings')
        .upsert({
          id: user.id,
          push_token: pushToken.data,
          notifications_enabled: true,
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error storing push token:', error);
        return null;
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
    // Remove token from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profile_settings')
        .update({
          push_token: null,
          notifications_enabled: false,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error removing push token:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
    return false;
  }
}

/**
 * Send a notification when a user receives a friend request
 */
export const sendFriendRequestNotification = async (
  receiverId: string,
  senderNickname: string
): Promise<void> => {
  try {
    await sendNotificationToUser(receiverId, {
      title: 'New Friend Request',
      body: `${senderNickname} sent you a friend request`,
      channelId: 'friend-requests',
      screen: 'friends',
      data: { senderNickname }
    });
  } catch (e) {
    console.error('Error sending friend request notification:', e);
    throw e;
  }
};

/**
 * Send a notification when a friend request is accepted
 */
export const sendFriendRequestAcceptedNotification = async (
  receiverId: string,
  accepterNickname: string
): Promise<void> => {
  try {
    await sendNotificationToUser(receiverId, {
      title: 'Friend Request Accepted',
      body: `${accepterNickname} accepted your friend request`,
      channelId: 'friend-requests',
      screen: 'friends',
      data: { accepterNickname }
    });
  } catch (e) {
    console.error('Error sending friend request accepted notification:', e);
    throw e;
  }
};

/**
 * Send a notification when a user is invited to a challenge
 */
export const sendChallengeInviteNotification = async (
  receiverId: string,
  senderNickname: string,
  challengeId: string,
  challengeName: string
): Promise<void> => {
  try {
    await sendNotificationToUser(receiverId, {
      title: 'Challenge Invite',
      body: `${senderNickname} invited you to join "${challengeName}"`,
      channelId: 'challenge-invites',
      screen: 'challengedetails',
      params: { id: challengeId },
      data: { senderNickname, challengeName }
    });
  } catch (e) {
    console.error('Error sending challenge invite notification:', e);
    throw e;
  }
};

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