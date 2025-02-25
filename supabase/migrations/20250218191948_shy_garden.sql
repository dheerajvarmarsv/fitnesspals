/*
  # Authentication and User Profiles Schema

  1. Core Tables
    - profiles: User profiles with essential information
      - id: UUID (links to auth.users)
      - email: Unique email address
      - nickname: User's display name
      - avatar_url: Profile picture URL
      - settings: JSON object for user preferences
      - created_at/updated_at: Timestamps

  2. Security
    - RLS enabled on profiles table
    - Policies for authenticated users
    - Email format validation
    - Automatic profile creation on signup
*/

-- Start fresh
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nickname text,
  avatar_url text,
  settings jsonb DEFAULT '{
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
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can insert profiles"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, LOWER(NEW.email))
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();