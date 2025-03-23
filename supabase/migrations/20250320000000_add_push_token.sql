-- This migration adds a push_token column to the profile_settings table
-- to store the device's push notification token

-- Add the push_token column to profile_settings
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create an index on push_token to speed up lookups
CREATE INDEX IF NOT EXISTS idx_profile_settings_push_token ON profile_settings(push_token);

-- Update the column comment
COMMENT ON COLUMN profile_settings.push_token IS 'Push notification token for the user''s device';