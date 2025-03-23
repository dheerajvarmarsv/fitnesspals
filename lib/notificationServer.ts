import { supabase } from './supabase';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

type NotificationData = {
  screen?: string;
  params?: Record<string, any>;
  title: string;
  body: string;
  channelId?: string;
};

/**
 * Send a push notification to a user by their user ID
 */
export async function sendNotificationToUser(
  userId: string,
  data: NotificationData,
  badgeCount?: number
) {
  try {
    console.log('Attempting to send notification to user:', userId);
    
    // Get user's push token and notification settings with improved logging
    const { data: user, error: userError } = await supabase
      .from('profile_settings')
      .select(`push_token, notifications_enabled`)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user profile settings:', userError);
      return false;
    }
    if (!user) {
      console.log('No profile settings found for user:', userId);
      return false;
    }
    if (!user.push_token) {
      console.log('No push token found for user:', userId);
      return false;
    }
    if (!user.notifications_enabled) {
      console.log('Notifications disabled for user:', userId);
      return false;
    }

    console.log('Sending push notification to token:', user.push_token);
    
    // Prepare notification payload
    const message = {
      to: user.push_token,
      data: {
        screen: data.screen,
        params: data.params,
      },
      title: data.title,
      body: data.body,
      sound: 'default',
      badge: badgeCount,
      channelId: data.channelId || 'default',
    };
    
    console.log('Notification payload:', JSON.stringify(message));

    // Send notification via Expo push API
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification response:', JSON.stringify(result));
    
    if (result.errors && result.errors.length > 0) {
      console.error('Push service returned errors:', result.errors);
      return false;
    }
    
    if (!result.data || !result.data.status) {
      console.error('Invalid response from push service:', result);
      return false;
    }
    
    if (result.data.status !== 'ok') {
      console.error('Push service returned non-ok status:', result.data.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    return false;
  }
}

/**
 * Send a friend request notification
 */
export async function sendFriendRequestNotification(
  receiverId: string,
  senderNickname: string
) {
  return sendNotificationToUser(receiverId, {
    title: 'New Friend Request',
    body: `${senderNickname} sent you a friend request`,
    channelId: 'friend-requests',
    screen: 'friends',
  });
}

/**
 * Send a challenge invite notification
 */
export async function sendChallengeInviteNotification(
  receiverId: string,
  senderNickname: string,
  challengeId: string,
  challengeName: string
) {
  return sendNotificationToUser(receiverId, {
    title: 'Challenge Invite',
    body: `${senderNickname} invited you to join "${challengeName}"`,
    channelId: 'challenge-invites',
    screen: 'challengedetails',
    params: { id: challengeId },
  });
}

/**
 * Send a challenge activity notification
 */
export async function sendChallengeActivityNotification(
  receiverId: string,
  participantNickname: string,
  challengeId: string,
  challengeName: string
) {
  return sendNotificationToUser(receiverId, {
    title: 'Challenge Update',
    body: `${participantNickname} logged an activity in "${challengeName}"`,
    channelId: 'challenge-activity',
    screen: 'challengedetails',
    params: { id: challengeId },
  });
}

/**
 * Send a challenge reminder notification
 */
export async function sendChallengeReminderNotification(
  userId: string, 
  challengeName: string,
  challengeId: string
) {
  return sendNotificationToUser(userId, {
    title: 'Challenge Reminder',
    body: `Don't forget to log your activity for "${challengeName}" today`,
    channelId: 'reminders',
    screen: 'challengedetails',
    params: { id: challengeId },
  });
}