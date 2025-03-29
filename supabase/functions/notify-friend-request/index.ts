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
    const payload: WebhookPayload = await req.json()
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get recipient's push token
    const { data: settings, error: settingsError } = await supabase
      .from('profile_settings')
      .select('push_token, notifications_enabled')
      .eq('id', payload.record.recipient_id)
      .single()

    if (settingsError || !settings?.push_token || !settings.notifications_enabled) {
      console.error('Error getting recipient settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Recipient not found or notifications disabled' }),
        { status: 400 }
      )
    }

    // Send push notification via Expo
    const notification = {
      to: settings.push_token,
      title: payload.record.title,
      body: payload.record.body,
      data: payload.record.data,
      sound: 'default',
      channelId: 'friend-requests',
      priority: 'high',
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Authorization': `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify(notification),
    })

    const result = await response.json()

    // Update notification status
    await supabase
      .from('notifications')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', payload.record.id)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: response.ok ? 200 : 400
      }
    )
  } catch (error) {
    console.error('Error processing notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
})