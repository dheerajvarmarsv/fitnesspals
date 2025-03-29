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
    // Log the start of notification sending
    await logNotificationEvent('notification_start', 
      `Starting to send notification to user ${userId}`, {
        payload: notification
      });

    // Get user's notification settings and profile
    const { data: settings, error: settingsError } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', userId)
      .single();

    if (settingsError) {
      await logNotificationEvent('notification_settings_error', 
        'Error fetching notification settings', { 
          error: settingsError.message,
          payload: { userId }
        });
      return false;
    }

    // Validate notification settings
    if (!settings) {
      await logNotificationEvent('notification_no_settings', 
        'No notification settings found', {
          payload: { userId }
        });
      return false;
    }

    if (!settings.notifications_enabled) {
      await logNotificationEvent('notifications_disabled', 
        'Notifications are disabled for user', {
          payload: { userId }
        });
      return false;
    }

    if (!settings.push_token) {
      await logNotificationEvent('no_push_token', 
        'No push token found for user', {
          payload: { userId }
        });
      return false;
    }

    // Prepare notification message
    const message = {
      to: settings.push_token,
      title: notification.title,
      body: notification.body,
      data: {
        screen: notification.screen,
        ...(notification.params || {})
      },
      sound: 'default',
      badge: 1,
      channelId: notification.channelId || 'default',
      priority: 'high',
      ttl: 60 * 60 * 24, // 24 hours
    };

    await logNotificationEvent('notification_sending', 
      'Sending push notification', { 
        pushToken: settings.push_token,
        payload: message
      });

    // Send notification
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([message]), // Expo expects an array of messages
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logNotificationEvent('notification_http_error', 
        'HTTP error from Expo push service', {
          error: `${response.status}: ${errorText}`,
          payload: message
        });
      return false;
    }

    const result = await response.json();
    const ticket = result.data?.[0];

    if (ticket?.status === 'error') {
      await logNotificationEvent('notification_expo_error', 
        'Error from Expo push service', {
          error: ticket.message,
          payload: { ticket, message }
        });
      return false;
    }

    await logNotificationEvent('notification_success', 
      'Successfully sent notification', {
        response: result,
        pushToken: settings.push_token
      });

    // Log to notification_logs table
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notification_logs').insert({
          event_type: 'push_notification',
          recipient_id: userId,
          sender_id: user.id,
          message: `${notification.title}: ${notification.body}`,
          status: 'sent',
          details: JSON.stringify({ message, result })
        });
      }
    } catch (logError) {
      console.error('Error logging notification:', logError);
    }

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logNotificationEvent('notification_error', 
      'Error sending notification', { 
        error: errorMessage,
        payload: { userId, notification }
      });
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