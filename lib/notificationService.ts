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
    if (!expoProjectId) {
      await logNotificationEvent('registration_error', 'Missing EAS project ID in app.config.ts');
      return null;
    }

    await logNotificationEvent('token_fetch', 'Fetching Expo push token');
    
    // Get the push token
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: expoProjectId,
    });

    await logNotificationEvent('token_received', 'Received Expo push token', {
      pushToken: pushToken.data
    });

    // 5. Save the token to the database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await logNotificationEvent('auth_error', 'No authenticated user found');
      return null;
    }

    // Create or update profile settings
    const { error: upsertError } = await supabase
      .from('profile_settings')
      .upsert({
        id: user.id,
        push_token: pushToken.data,
        notifications_enabled: true,
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      await logNotificationEvent('db_error', 'Error saving push token', {
        error: upsertError.message
      });
      return null;
    }

    await logNotificationEvent('token_saved', 'Successfully saved push token');

    // Log the registration
    try {
      await supabase.from('notification_logs').insert({
        event_type: 'token_registration',
        recipient_id: user.id,
        sender_id: user.id,
        message: 'Push token registration',
        status: 'success',
        details: JSON.stringify({ token: pushToken.data })
      });
    } catch (logError: unknown) {
      const errorMessage = logError instanceof Error ? logError.message : String(logError);
      console.error('Error logging token registration:', errorMessage);
    }

    return pushToken.data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logNotificationEvent('registration_error', 'Error registering for push notifications', {
      error: errorMessage
    });
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

// Send a friend request notification
export async function sendFriendRequestNotification(
  receiverId: string,
  senderNickname: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Insert into notifications table to trigger webhook
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: receiverId,
        sender_id: user.id,
        type: 'friend_request',
        title: 'New Friend Request',
        body: `${senderNickname} sent you a friend request`,
        data: {
          screen: 'friends'
        }
      });

    if (error) {
      console.error('Error sending friend request notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendFriendRequestNotification:', error);
    return false;
  }
}

// Send a challenge invite notification
export async function sendChallengeInviteNotification(
  receiverId: string,
  senderNickname: string,
  challengeId: string,
  challengeName: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Insert into notifications table to trigger webhook
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: receiverId,
        sender_id: user.id,
        type: 'challenge_invite',
        title: 'Challenge Invite',
        body: `${senderNickname} invited you to join "${challengeName}"`,
        data: {
          screen: 'challengedetails',
          params: { id: challengeId }
        }
      });

    if (error) {
      console.error('Error sending challenge invite notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendChallengeInviteNotification:', error);
    return false;
  }
}

// Send a test notification (for development testing)
export async function sendTestNotification() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Get current user's nickname
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    const nickname = profile?.nickname || 'Someone';

    // Send both types of notifications for testing
    await Promise.all([
      // Friend request notification
      supabase.from('notifications').insert({
        recipient_id: user.id,
        sender_id: user.id,
        type: 'friend_request',
        title: 'Test Friend Request',
        body: `${nickname} sent you a friend request`,
        data: { screen: 'friends' }
      }),
      // Challenge invite notification
      supabase.from('notifications').insert({
        recipient_id: user.id,
        sender_id: user.id,
        type: 'challenge_invite',
        title: 'Test Challenge Invite',
        body: `${nickname} invited you to join "Test Challenge"`,
        data: {
          screen: 'challengedetails',
          params: { id: 'test-challenge' }
        }
      })
    ]);

    return true;
  } catch (error) {
    console.error('Error sending test notifications:', error);
    return false;
  }
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