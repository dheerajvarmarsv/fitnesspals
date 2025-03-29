import { supabase } from './supabase';
import { logNotificationEvent } from './notificationDebug';

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
  screen?: string;
  params?: Record<string, any>;
  channelId?: string;
}

/**
 * Send a push notification to a user by their user ID
 */
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload
) {
  try {
    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', userId)
      .single();

    if (settingsError) {
      await logNotificationEvent('notification_settings_error', 
        'Error fetching notification settings', { error: settingsError.message });
      return false;
    }

    if (!settings?.push_token || !settings?.notifications_enabled) {
      await logNotificationEvent('notification_no_token', 
        'User has no push token or notifications disabled', {
          payload: {
            has_token: !!settings?.push_token,
            notifications_enabled: settings?.notifications_enabled
          }
        });
      return false;
    }

    // Prepare notification message
    const message = {
      to: settings.push_token,
      title: notification.title,
      body: notification.body,
      data: notification.params ? {
        screen: notification.screen,
        ...notification.params
      } : { screen: notification.screen },
      sound: 'default',
      badge: 1,
      channelId: notification.channelId
    };

    await logNotificationEvent('notification_sending', 
      'Sending push notification', { pushToken: settings.push_token });

    // Send notification
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    await logNotificationEvent('notification_response', 
      'Received response from Expo push service', {
        response: result,
        error: result.errors ? JSON.stringify(result.errors) : null
      });

    return !result.errors;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logNotificationEvent('notification_error', 
      'Error sending notification', { error: errorMessage });
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