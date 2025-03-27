// supabase/functions/notify-friend-request/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Expo Push Notification API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Create Supabase client with service role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Get the request data
    const requestBody = await req.json();
    const { record, type } = requestBody;
    
    // Log start of notification processing
    await supabaseAdmin.from('notification_debug').insert({
      user_id: record?.receiver_id,
      event_type: 'friend_request_edge_start',
      description: 'Starting friend request notification processing',
      payload: requestBody
    });
    
    if (!record || !record.receiver_id) {
      await supabaseAdmin.from('notification_debug').insert({
        user_id: null,
        event_type: 'friend_request_invalid_data',
        description: 'Invalid request data',
        payload: requestBody,
        error: 'Missing receiver_id in record'
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get sender info
    await supabaseAdmin.from('notification_debug').insert({
      user_id: record.receiver_id,
      event_type: 'friend_request_fetching_sender',
      description: 'Fetching sender profile information',
      payload: { sender_id: record.sender_id }
    });
    
    const { data: senderProfile, error: senderError } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', record.sender_id)
      .single()

    if (senderError) {
      await supabaseAdmin.from('notification_debug').insert({
        user_id: record.receiver_id,
        event_type: 'friend_request_sender_error',
        description: 'Error fetching sender profile',
        error: senderError.message
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'Sender not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get receiver push token
    await supabaseAdmin.from('notification_debug').insert({
      user_id: record.receiver_id,
      event_type: 'friend_request_fetching_token',
      description: 'Fetching receiver push token',
    });
    
    const { data: receiverSettings, error: receiverError } = await supabaseAdmin
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', record.receiver_id)
      .single()

    if (receiverError) {
      await supabaseAdmin.from('notification_debug').insert({
        user_id: record.receiver_id,
        event_type: 'friend_request_receiver_error',
        description: 'Error fetching receiver settings',
        error: receiverError.message
      });
    }
    
    if (!receiverSettings?.push_token || !receiverSettings?.notifications_enabled) {
      await supabaseAdmin.from('notification_debug').insert({
        user_id: record.receiver_id,
        event_type: 'friend_request_no_token',
        description: 'Receiver has no push token or notifications disabled',
        payload: {
          has_token: !!receiverSettings?.push_token,
          notifications_enabled: receiverSettings?.notifications_enabled
        }
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'Receiver has no push token or notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Send push notification
    const notificationPayload = {
      to: receiverSettings.push_token,
      title: 'New Friend Request',
      body: `${senderProfile.nickname} sent you a friend request`,
      data: { screen: 'friends' },
      sound: 'default',
      badge: 1,
      channelId: 'friend-requests'
    };
    
    await supabaseAdmin.from('notification_debug').insert({
      user_id: record.receiver_id,
      event_type: 'friend_request_sending',
      description: 'Sending push notification',
      push_token: receiverSettings.push_token,
      payload: notificationPayload
    });
    
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationPayload),
    })

    const result = await response.json()
    
    // Log response from Expo
    await supabaseAdmin.from('notification_debug').insert({
      user_id: record.receiver_id,
      event_type: 'friend_request_response',
      description: 'Received response from Expo push service',
      push_token: receiverSettings.push_token,
      response: result,
      error: result.errors ? JSON.stringify(result.errors) : null
    });
    
    // Log push notification result to Supabase
    await supabaseAdmin
      .from('notification_logs')
      .insert({
        event_type: 'friend_request',
        recipient_id: record.receiver_id,
        sender_id: record.sender_id,
        resource_id: record.id,
        message: `Friend request from ${senderProfile.nickname}`,
        status: result.errors ? 'failed' : 'sent',
        details: JSON.stringify(result)
      })

    await supabaseAdmin.from('notification_debug').insert({
      user_id: record.receiver_id,
      event_type: 'friend_request_complete',
      description: 'Friend request notification process completed',
      push_token: receiverSettings.push_token,
    });
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Log the error
    try {
      await supabaseAdmin.from('notification_debug').insert({
        user_id: null, // We might not know the user ID here
        event_type: 'friend_request_exception',
        description: 'Unhandled exception in friend request notification',
        error: error.message,
      });
    } catch (logError) {
      console.error('Error logging to notification_debug:', logError);
    }
    
    console.error('Error processing notification:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})