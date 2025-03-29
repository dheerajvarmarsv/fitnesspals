Database Schema - Complete Tables and Columns
1. subscription_history
* id: UUID (primary key)
* user_id: UUID (foreign key)
* transaction_id: TEXT
* product_id: TEXT
* subscription_tier: TEXT
* payment_provider: TEXT
* amount: NUMERIC
* currency: TEXT
* start_date: TIMESTAMP
* end_date: TIMESTAMP
* status: TEXT
* created_at: TIMESTAMP
2. friends
* id: UUID (primary key)
* user_id: UUID (foreign key)
* friend_id: UUID (foreign key)
* status_id: TEXT
* created_at: TIMESTAMP
3. friend_requests
* id: UUID (primary key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
4. profile_settings
* id: UUID (primary key)
* timezone: TEXT
* display_mode: TEXT
* use_kilometers: BOOLEAN
* notification_settings: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
5. profiles
* id: UUID (primary key)
* email: TEXT
* nickname: TEXT
* avatar_url: TEXT
* settings: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* trial_stage: TEXT
* subscription_tier: TEXT
* subscription_expiry: TIMESTAMP
* subscription_status: TEXT
* trial_end_date: TIMESTAMP
* plan: TEXT
* description: TEXT
6. challenge
* id: UUID (primary key)
* description: TEXT
* challenge_type: TEXT
* status: TEXT
* start_date: TIMESTAMP
* end_date: TIMESTAMP
* is_private: BOOLEAN
* rules: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* survival_settings: JSONB
7. challenge_activities
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* user_id: UUID (foreign key)
* activity_type: TEXT
* points: INTEGER
* target_value: NUMERIC
* metric: TEXT
* timeframe: TEXT
8. activities
* id: UUID (primary key)
* user_id: UUID (foreign key)
* activity_type: TEXT
* duration: NUMERIC
* distance: NUMERIC
* calories: NUMERIC
* steps: INTEGER
* count: INTEGER
* notes: TEXT
* metric: TEXT
* source: TEXT
* created_at: TIMESTAMP
9. challenge_invites
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
10. challenge_participants
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* user_id: UUID (foreign key)
* status: TEXT
* joined_at: TIMESTAMP
* current_streak: INTEGER
* longest_streak: INTEGER
* total_points: INTEGER
* map_position: INTEGER
* last_awarded_day: DATE
* last_awarded_week: DATE
* last_activity_date: TIMESTAMP
* distance_from_center: NUMERIC
* angle: NUMERIC
* is_eliminated: BOOLEAN
* lives: INTEGER
* days_in_danger: INTEGER
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* processed_activity_ids: TEXT[]
11. challenge_rules
* challenge_id: UUID (foreign key, primary key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
12. health_data
* id: UUID (primary key)
* user_id: UUID (foreign key)
* date: DATE
* activity_id: UUID
* steps: INTEGER
* distance: NUMERIC
* calories: NUMERIC
* heart_rate: NUMERIC
* sleep_minutes: INTEGER
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
13. user_fitness_connections
* id: UUID (primary key)
* user_id: UUID (foreign key)
* type: TEXT
* connected: BOOLEAN
* last_synced: TIMESTAMP
* permissions: TEXT[]
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* source_id: TEXT
* expire_at: TIMESTAMP
* status: TEXT
* device_info: JSONB
* last_sync_status: TEXT
* last_sync_error: TEXT
* last_sync_count: INTEGER



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
RETURNS TRIGGER AS $$
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
-- These values need to be set in production via Supabase Dashboard
-- Do not hardcode sensitive values in migrations
COMMENT ON SCHEMA public IS E'@app.settings.webhook_url_base=https://fwpjrhycsjlgymfexcwt.supabase.co\n@app.settings.service_role_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cGpyaHljc2psZ3ltZmV4Y3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTkwNDc0MCwiZXhwIjoyMDU1NDgwNzQwfQ.cHEZwzBxXKq8b8bEKXTM7XwVuW0SBe36QNftk7D6f18';