/*
  # Add profile settings table and columns
  
  1. New Tables
    - Add profile_settings table with all settings columns
    - Link to profiles table
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create profile_settings table
CREATE TABLE IF NOT EXISTS public.profile_settings (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  privacy_mode text NOT NULL DEFAULT 'public' CHECK (privacy_mode IN ('public', 'friends', 'private')),
  use_kilometers boolean NOT NULL DEFAULT true,
  notification_challenges boolean NOT NULL DEFAULT true,
  notification_chat boolean NOT NULL DEFAULT true,
  notification_sync boolean NOT NULL DEFAULT true,
  notification_friends boolean NOT NULL DEFAULT true,
  notification_badges boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own settings"
  ON public.profile_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own settings"
  ON public.profile_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create trigger to auto-create settings on profile creation
CREATE OR REPLACE FUNCTION create_profile_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profile_settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_settings();