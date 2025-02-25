/*
  # Add profile settings columns

  1. Changes
    - Add settings column to profiles table with JSON structure
    - Add avatar_url column if not exists
    - Add last_login column for tracking
    - Add constraints and defaults
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for settings JSON structure
*/

-- Add settings column with proper JSON structure and validation
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "timezone": "UTC",
  "privacyMode": "public",
  "useKilometers": true,
  "notificationSettings": {
    "challenges": true,
    "chat": true,
    "sync": true,
    "friends": true,
    "badges": true
  }
}'::jsonb;

-- Add avatar_url if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Add last_login column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add check constraint for settings JSON structure
ALTER TABLE public.profiles
ADD CONSTRAINT valid_settings_json
CHECK (
  jsonb_typeof(settings) = 'object' AND
  settings ? 'timezone' AND
  settings ? 'privacyMode' AND
  settings ? 'useKilometers' AND
  settings ? 'notificationSettings'
);

-- Create function to update last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for last_login updates
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_last_login();