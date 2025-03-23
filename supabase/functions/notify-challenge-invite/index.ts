// supabase/functions/notify-challenge-invite/index.ts
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

  try {
    // Get the request data
    const { record, type } = await req.json()
    
    if (!record || !record.receiver_id || !record.challenge_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenge')
      .select('title, description, challenge_type')
      .eq('id', record.challenge_id)
      .single()

    if (challengeError) {
      console.error('Error fetching challenge:', challengeError)
      return new Response(
        JSON.stringify({ success: false, error: 'Challenge not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get sender info
    const { data: senderProfile, error: senderError } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', record.sender_id)
      .single()

    if (senderError) {
      console.error('Error fetching sender profile:', senderError)
      return new Response(
        JSON.stringify({ success: false, error: 'Sender not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get receiver push token
    const { data: receiverSettings, error: receiverError } = await supabaseAdmin
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', record.receiver_id)
      .single()

    if (receiverError || !receiverSettings?.push_token || !receiverSettings?.notifications_enabled) {
      console.log('Receiver has no push token or notifications disabled:', {
        error: receiverError,
        settings: receiverSettings
      })
      return new Response(
        JSON.stringify({ success: false, error: 'Receiver has no push token or notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Challenge name or type if no title
    const challengeName = challenge.title || `${challenge.challenge_type.toUpperCase()} Challenge`;

    // Send push notification
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: receiverSettings.push_token,
        title: 'Challenge Invite',
        body: `${senderProfile.nickname} invited you to join "${challengeName}"`,
        data: { 
          screen: 'challengedetails',
          params: { id: record.challenge_id }
        },
        sound: 'default',
        badge: 1,
        channelId: 'challenge-invites'
      }),
    })

    const result = await response.json()
    
    // Log push notification result to Supabase
    await supabaseAdmin
      .from('notification_logs')
      .insert({
        event_type: 'challenge_invite',
        recipient_id: record.receiver_id,
        sender_id: record.sender_id,
        resource_id: record.id,
        message: `Challenge invite from ${senderProfile.nickname} for "${challengeName}"`,
        status: result.errors ? 'failed' : 'sent',
        details: JSON.stringify(result)
      })

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing notification:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})