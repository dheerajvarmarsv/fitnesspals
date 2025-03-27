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
    
    // Import the logging function
    const { logNotificationEvent } = await import('./notificationDebug');
    await logNotificationEvent('notification_send_start', 
      `Starting direct notification to user ${userId}`, {
        payload: data
      });
    
    // Get user's push token and notification settings with improved logging
    const { data: user, error: userError } = await supabase
      .from('profile_settings')
      .select(`push_token, notifications_enabled`)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user profile settings:', userError);
      await logNotificationEvent('notification_user_error', 
        'Error fetching user profile settings', {
          error: userError.message
        });
      return false;
    }
    
    if (!user) {
      console.log('No profile settings found for user:', userId);
      await logNotificationEvent('notification_no_settings', 
        'No profile settings found for user');
      return false;
    }
    
    await logNotificationEvent('notification_settings_found', 
      'Retrieved notification settings', {
        payload: {
          has_token: !!user.push_token,
          notifications_enabled: user.notifications_enabled
        }
      });
    
    if (!user.push_token) {
      console.log('No push token found for user:', userId);
      await logNotificationEvent('notification_no_token', 
        'No push token found for user');
      return false;
    }
    
    if (!user.notifications_enabled) {
      console.log('Notifications disabled for user:', userId);
      await logNotificationEvent('notification_disabled', 
        'Notifications disabled for user');
      return false;
    }

    console.log('Sending push notification to token:', user.push_token);
    await logNotificationEvent('notification_sending', 
      'Sending push notification', {
        pushToken: user.push_token
      });
    
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
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification response:', JSON.stringify(result));
    
    await logNotificationEvent('notification_response', 
      'Received response from Expo push service', {
        response: result,
        error: result.errors ? JSON.stringify(result.errors) : null
      });
    
    // Store notification attempt in logs
    try {
      await supabase
        .from('notification_logs')
        .insert({
          event_type: 'direct_push',
          recipient_id: userId,
          sender_id: userId, // may be updated by caller
          message: data.title + ': ' + data.body,
          status: result.errors ? 'failed' : 'sent',
          details: JSON.stringify(result)
        });
    } catch (logError) {
      console.error('Error logging notification:', logError);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.error('Push service returned errors:', result.errors);
      await logNotificationEvent('notification_errors', 
        'Push service returned errors', {
          error: JSON.stringify(result.errors)
        });
      return false;
    }
    
    if (!result.data) {
      console.error('Invalid response from push service:', result);
      await logNotificationEvent('notification_invalid_response', 
        'Invalid response from push service', {
          error: 'No data field in response'
        });
      return false;
    }
    
    await logNotificationEvent('notification_success', 
      'Successfully sent notification');
    return true;
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    
    try {
      const { logNotificationEvent } = await import('./notificationDebug');
      await logNotificationEvent('notification_exception', 
        'Exception in sendNotificationToUser', {
          error: error.message
        });
    } catch (logError) {
      console.error('Error logging notification exception:', logError);
    }
    
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