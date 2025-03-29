import { createClient } from '@supabase/supabase-js';

interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'friend_request' | 'challenge_invite';
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Notification;
  schema: 'public';
  old_record: null | Notification;
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    
    // Get recipient's push token
    const { data: settings, error: settingsError } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', payload.record.recipient_id)
      .single();

    if (settingsError || !settings?.push_token || !settings.notifications_enabled) {
      console.error('Error getting recipient settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Recipient not found or notifications disabled' }),
        { status: 400 }
      );
    }

    // Get sender's nickname
    const { data: sender } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', payload.record.sender_id)
      .single();

    // Prepare notification data
    const notification = {
      to: settings.push_token,
      title: payload.record.title,
      body: payload.record.body,
      data: {
        ...payload.record.data,
        type: payload.record.type,
        sender: sender?.nickname
      },
      sound: 'default',
      channelId: payload.record.type === 'friend_request' ? 'friend-requests' : 'challenge-invites',
      priority: 'high',
    };

    // Send push notification via Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Authorization': `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();

    // Log the notification attempt
    await supabase.from('notification_logs').insert({
      event_type: 'push_notification',
      recipient_id: payload.record.recipient_id,
      sender_id: payload.record.sender_id,
      message: payload.record.body,
      status: response.ok ? 'sent' : 'failed',
      details: JSON.stringify({ notification, response: result })
    });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400
      }
    );
  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}); 