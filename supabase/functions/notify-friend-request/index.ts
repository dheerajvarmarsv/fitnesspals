// supabase/functions/notify-friend-request/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    recipient_id: string
    sender_id: string
    type: string
    title: string
    body: string
    data: Record<string, any>
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log request details
    console.log('Received request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const payload = await req.json();
    console.log('Received payload:', payload);

    // Validate payload
    if (!payload.record?.recipient_id || !payload.record?.sender_id) {
      console.error('Invalid payload structure:', payload);
      return new Response(
        JSON.stringify({ error: 'Invalid payload structure' }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');

    // Log environment variables (without showing full values)
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasExpoToken: !!expoToken,
    });

    if (!supabaseUrl || !supabaseKey || !expoToken) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recipient's push token
    console.log('Fetching recipient settings for ID:', payload.record.recipient_id);
    const { data: settings, error: settingsError } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', payload.record.recipient_id)
      .single();

    console.log('Recipient settings result:', {
      hasSettings: !!settings,
      error: settingsError?.message,
      hasToken: !!settings?.push_token,
      notificationsEnabled: settings?.notifications_enabled
    });

    if (settingsError || !settings?.push_token || !settings.notifications_enabled) {
      console.error('Error getting recipient settings:', {
        error: settingsError,
        settings
      });
      return new Response(
        JSON.stringify({ 
          error: 'Recipient not found or notifications disabled',
          details: {
            hasSettings: !!settings,
            hasToken: !!settings?.push_token,
            notificationsEnabled: settings?.notifications_enabled
          }
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get sender's nickname
    console.log('Fetching sender details for ID:', payload.record.sender_id);
    const { data: sender } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', payload.record.sender_id)
      .single();

    console.log('Sender details:', sender);

    // Send push notification via Expo
    const notification = {
      to: settings.push_token,
      title: payload.record.title,
      body: payload.record.body,
      data: {
        ...payload.record.data,
        senderNickname: sender?.nickname
      },
      sound: 'default',
      channelId: 'friend-requests',
      priority: 'high',
    };

    console.log('Sending notification:', notification);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Authorization': `Bearer ${expoToken}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    console.log('Expo response:', result);

    // Update notification status
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', payload.record.id);

    if (updateError) {
      console.error('Error updating notification status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        result,
        notification: {
          id: payload.record.id,
          recipient: payload.record.recipient_id,
          sender: sender?.nickname,
          type: payload.record.type
        }
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400
      }
    );
  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})