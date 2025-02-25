/*
  # Fix profile settings creation
  
  1. Changes
    - Add insert policy for profile_settings
    - Update trigger to handle existing users
    - Add upsert functionality
  
  2. Security
    - Maintain RLS policies
    - Add proper constraints
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS create_profile_settings();

-- Add insert policy
CREATE POLICY "Users can insert own settings"
  ON public.profile_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create improved function to handle profile settings creation
CREATE OR REPLACE FUNCTION create_profile_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profile_settings (
    id,
    timezone,
    privacy_mode,
    use_kilometers,
    notification_challenges,
    notification_chat,
    notification_sync,
    notification_friends,
    notification_badges
  ) VALUES (
    NEW.id,
    COALESCE(NEW.settings->>'timezone', 'UTC'),
    COALESCE(NEW.settings->>'privacyMode', 'public'),
    COALESCE((NEW.settings->>'useKilometers')::boolean, true),
    COALESCE((NEW.settings->'notificationSettings'->>'challenges')::boolean, true),
    COALESCE((NEW.settings->'notificationSettings'->>'chat')::boolean, true),
    COALESCE((NEW.settings->'notificationSettings'->>'sync')::boolean, true),
    COALESCE((NEW.settings->'notificationSettings'->>'friends')::boolean, true),
    COALESCE((NEW.settings->'notificationSettings'->>'badges')::boolean, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    timezone = EXCLUDED.timezone,
    privacy_mode = EXCLUDED.privacy_mode,
    use_kilometers = EXCLUDED.use_kilometers,
    notification_challenges = EXCLUDED.notification_challenges,
    notification_chat = EXCLUDED.notification_chat,
    notification_sync = EXCLUDED.notification_sync,
    notification_friends = EXCLUDED.notification_friends,
    notification_badges = EXCLUDED.notification_badges,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_settings();

-- Create settings for existing profiles
INSERT INTO public.profile_settings (
  id,
  timezone,
  privacy_mode,
  use_kilometers,
  notification_challenges,
  notification_chat,
  notification_sync,
  notification_friends,
  notification_badges
)
SELECT 
  id,
  'UTC',
  'public',
  true,
  true,
  true,
  true,
  true,
  true
FROM public.profiles
WHERE id NOT IN (SELECT id FROM public.profile_settings)
ON CONFLICT (id) DO NOTHING;