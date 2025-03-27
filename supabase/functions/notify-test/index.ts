import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Expo Push Notification API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Create Supabase client with service role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Parse request body
    const { user_id, message } = await req.json();
    
    // Log the test request
    await supabaseAdmin.from('notification_debug').insert({
      user_id,
      event_type: 'server_test',
      description: 'Server test notification initiated',
      payload: { message }
    });

    if (!user_id) {
      throw new Error('Missing user_id in request');
    }

    // Get the user's push token
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', user_id)
      .single();

    if (settingsError) {
      await supabaseAdmin.from('notification_debug').insert({
        user_id,
        event_type: 'server_test_error',
        description: 'Error fetching user settings',
        error: settingsError.message
      });
      
      throw new Error(`Error fetching user settings: ${settingsError.message}`);
    }

    if (!settings.push_token || !settings.notifications_enabled) {
      await supabaseAdmin.from('notification_debug').insert({
        user_id,
        event_type: 'server_test_error',
        description: 'No push token or notifications disabled',
        error: 'No push token or notifications disabled'
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'No push token or notifications disabled',
        details: {
          has_token: !!settings.push_token,
          notifications_enabled: settings.notifications_enabled
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Log before sending
    await supabaseAdmin.from('notification_debug').insert({
      user_id,
      event_type: 'send_push_attempt',
      description: 'Attempting to send push notification',
      push_token: settings.push_token,
      payload: {
        to: settings.push_token,
        title: 'Test Notification',
        body: message || 'This is a test notification',
        data: { screen: 'debug/notifications' }
      }
    });

    // Send push notification via Expo
    const pushPayload = {
      to: settings.push_token,
      title: 'Test Notification',
      body: message || 'This is a test notification',
      data: { screen: 'debug/notifications' },
      sound: 'default',
      channelId: 'default',
    };

    const pushResponse = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.json();

    // Log after sending
    await supabaseAdmin.from('notification_debug').insert({
      user_id,
      event_type: 'push_send_result',
      description: `Push send result: ${pushResult.data?.status || 'unknown'}`,
      push_token: settings.push_token,
      response: pushResult
    });

    // Create entry in notification_logs table as well
    await supabaseAdmin.from('notification_logs').insert({
      event_type: 'test_notification',
      recipient_id: user_id,
      sender_id: user_id,
      message: message || 'Test notification',
      status: pushResult.errors ? 'failed' : 'sent',
      details: JSON.stringify(pushResult)
    });

    return new Response(JSON.stringify({
      success: true,
      result: pushResult,
      details: {
        token: settings.push_token,
        payload: pushPayload
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in notify-test function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});