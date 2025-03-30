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
    // Get user's notification settings and profile
    const { data: settings, error: settingsError } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled, id')
      .eq('id', userId)
      .single();

    if (settingsError) {
      // Try to create settings if they don't exist
      const { data: newSettings, error: createError } = await supabase
        .from('profile_settings')
        .insert({ id: userId, notifications_enabled: true })
        .select()
        .single();

      if (createError) {
        return false;
      }

      // Use the newly created settings
      if (newSettings) {
        // await logNotificationEvent('notification_settings_created', 
        //   'Created new notification settings', {
        //     payload: { userId }
        //   });
      }
    }

    // For immediate testing, send a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: {
          screen: notification.screen,
          ...(notification.params || {})
        },
        sound: true,
      },
      trigger: { seconds: 1 },
    });

    // await logNotificationEvent('local_notification_sent', 
    //   'Sent local notification', {
    //     payload: notification
    //   });

    // If we have a push token, also try to send remote notification
    if (settings?.push_token) {
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

      // Send remote notification
      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([message]),
      });

      if (!response.ok) {
        // await logNotificationEvent('remote_notification_error', 
        //   'Error sending remote notification', {
        //     error: errorText,
        //     payload: message
        //   });
      } else {
        // await logNotificationEvent('remote_notification_sent', 
        //   'Sent remote notification', {
        //     payload: message
        //   });
      }
    }

    // Log to notification_logs table
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notification_logs').insert({
          event_type: 'notification_sent',
          recipient_id: userId,
          sender_id: user.id,
          message: `${notification.title}: ${notification.body}`,
          status: 'sent',
          details: JSON.stringify({ notification })
        });
      }
    } catch (logError) {
      console.error('Error logging notification:', logError);
    }

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // await logNotificationEvent('notification_error', 
    //   'Error sending notification', { 
    //     error: errorMessage,
    //     payload: { userId, notification }
    //   });
    console.error('Error sending notification:', error);
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