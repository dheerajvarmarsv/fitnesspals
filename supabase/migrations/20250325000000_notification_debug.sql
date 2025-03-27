-- Add notification debug table for extensive logging
CREATE TABLE IF NOT EXISTS notification_debug (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  description TEXT,
  device_info JSONB,
  push_token TEXT,
  error TEXT,
  payload JSONB,
  response JSONB
);

CREATE INDEX idx_notification_debug_user ON notification_debug(user_id);
CREATE INDEX idx_notification_debug_event ON notification_debug(event_type);