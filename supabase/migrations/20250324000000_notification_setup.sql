-- Add necessary columns for notifications
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

-- Create notification logs table for debugging
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID,
  message TEXT,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for easier querying
  CONSTRAINT valid_status CHECK (status IN ('sent', 'failed', 'delivered', 'unknown'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_profile_settings_push_token ON profile_settings(push_token) 
WHERE push_token IS NOT NULL AND notifications_enabled = true;

-- Functions for triggering Supabase Edge Functions

-- Friend request hook
CREATE OR REPLACE FUNCTION trigger_friend_request_notification()
RETURNS TRIGGER AS $$$
BEGIN
  -- Trigger only for new pending friend requests
  IF NEW.status = 'pending' THEN
    -- Call the Edge Function
    PERFORM net.http_post(
      url := (CURRENT_SETTING('app.settings.webhook_url_base') || '/functions/v1/notify-friend-request'),
      body := json_build_object('record', NEW, 'type', TG_OP),
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || CURRENT_SETTING('app.settings.service_role_key') || '"}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors but don't fail the transaction
    RAISE WARNING 'Error in trigger_friend_request_notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Challenge invite hook
CREATE OR REPLACE FUNCTION trigger_challenge_invite_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function
  PERFORM net.http_post(
    url := (CURRENT_SETTING('app.settings.webhook_url_base') || '/functions/v1/notify-challenge-invite'),
    body := json_build_object('record', NEW, 'type', TG_OP),
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || CURRENT_SETTING('app.settings.service_role_key') || '"}'::jsonb
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors but don't fail the transaction
    RAISE WARNING 'Error in trigger_challenge_invite_notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers

-- Trigger for friend requests
DROP TRIGGER IF EXISTS on_friend_request_created ON friend_requests;
CREATE TRIGGER on_friend_request_created
AFTER INSERT ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_friend_request_notification();

-- Trigger for challenge invites
DROP TRIGGER IF EXISTS on_challenge_invite_created ON challenge_invites;
CREATE TRIGGER on_challenge_invite_created
AFTER INSERT ON challenge_invites
FOR EACH ROW
EXECUTE FUNCTION trigger_challenge_invite_notification();

-- Set required configuration
-- These would be set in production via Supabase Dashboard
COMMENT ON SCHEMA public IS E'@app.settings.webhook_url_base=https://YOUR-SUPABASE-PROJECT-REF.supabase.co\n@app.settings.service_role_key=NO_SET_IN_MIGRATION';