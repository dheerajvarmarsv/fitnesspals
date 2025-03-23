// lib/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Set up Android channels for our notification types
async function setupAndroidChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('friend-requests', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.HIGH,
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
  // 1. Check if running on a physical device
  if (!Device.isDevice) {
    console.log('Push notifications not available on simulator/emulator');
    return false;
  }

  // 2. Check if on a supported platform
  if (Platform.OS === 'web') {
    console.log('Push notifications not available on web');
    return false;
  }

  // 3. Make sure the Expo project is configured
  if (!Constants.expoConfig?.extra?.eas?.projectId) {
    console.log('Push notifications require EAS project ID');
    return false;
  }

  return true;
}

// Request permission for push notifications
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  
  return true;
}

// Register for push notifications
export async function registerForPushNotifications() {
  console.log('Registering for push notifications...');
  
  try {
    // Check device compatibility
    if (!await isPushNotificationsAvailable()) {
      return null;
    }

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return null;
    }

    // Set up Android channels
    await setupAndroidChannels();

    // Get the token
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    console.log('Expo push token:', expoPushToken.data);

    // Save token to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profile_settings')
        .update({ 
          push_token: expoPushToken.data,
          notifications_enabled: true
        })
        .eq('id', user.id);
    }

    return expoPushToken.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// Unregister from push notifications
export async function unregisterFromPushNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profile_settings')
      .update({ 
        push_token: null,
        notifications_enabled: false 
      })
      .eq('id', user.id);
      
    console.log('Unregistered from push notifications');
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
  }
}

// Send a local test notification
export async function sendLocalTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "This is a test notification",
      data: { screen: 'friends' },
    },
    trigger: { seconds: 2 },
  });
}

// Send a friend request notification
export async function sendFriendRequestNotification(receiverId: string, senderNickname: string) {
  try {
    // Check if receiver has push token and notifications enabled
    const { data: receiverSettings, error } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', receiverId)
      .single();
      
    if (error || !receiverSettings?.push_token || !receiverSettings?.notifications_enabled) {
      console.log('Cannot send notification - receiver has no token or disabled notifications');
      return false;
    }
    
    // Call Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: receiverSettings.push_token,
        title: 'New Friend Request',
        body: `${senderNickname} sent you a friend request`,
        data: { screen: 'friends' },
        sound: 'default',
        channelId: Platform.OS === 'android' ? 'friend-requests' : undefined,
      }),
    });
    
    const result = await response.json();
    console.log('Push notification result:', result);
    
    return !result.errors;
  } catch (error) {
    console.error('Error sending friend request notification:', error);
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
    // Check if receiver has push token and notifications enabled
    const { data: receiverSettings, error } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', receiverId)
      .single();
      
    if (error || !receiverSettings?.push_token || !receiverSettings?.notifications_enabled) {
      console.log('Cannot send notification - receiver has no token or disabled notifications');
      return false;
    }
    
    // Call Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: receiverSettings.push_token,
        title: 'Challenge Invite',
        body: `${senderNickname} invited you to join "${challengeName}"`,
        data: { 
          screen: 'challengedetails',
          params: { id: challengeId }
        },
        sound: 'default',
        channelId: Platform.OS === 'android' ? 'challenge-invites' : undefined,
      }),
    });
    
    const result = await response.json();
    console.log('Push notification result:', result);
    
    return !result.errors;
  } catch (error) {
    console.error('Error sending challenge invite notification:', error);
    return false;
  }
}