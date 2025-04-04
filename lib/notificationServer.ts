import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

type NotificationData = {
  screen?: string;
  params?: Record<string, any>;
  title: string;
  body: string;
  channelId?: string;
};

interface NotificationPayload {
  title: string;
  body: string;
  channelId?: string;
  screen?: string;
  params?: Record<string, any>;
  data?: Record<string, any>;
}

/**
 * Send a push notification to a user by their user ID
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
) {
  try {
    // Get user's push token
    const { data: settings } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', userId)
      .single();

    // Check if user has notifications enabled and has a push token
    if (!settings?.notifications_enabled || !settings?.push_token) {
      console.log('User has notifications disabled or no push token');
      return;
    }

    // Send push notification
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: settings.push_token,
        title: payload.title,
        body: payload.body,
        data: {
          screen: payload.screen,
          params: payload.params,
          ...payload.data
        },
        sound: 'default',
        badge: 1,
        channelId: payload.channelId,
      }),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
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