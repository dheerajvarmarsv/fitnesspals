/*
  # Add nickname support to profiles table

  1. Changes
    - Add nickname column with uniqueness and format validation
    - Add trigger for nickname case normalization
    - Update RLS policies for profile management

  2. Security
    - Maintain RLS
    - Add specific checks for nickname uniqueness
*/

-- Start fresh
DROP TRIGGER IF EXISTS enforce_nickname_case ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_nickname_case();

-- Add nickname column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN nickname text,
    ADD CONSTRAINT nickname_unique UNIQUE (nickname),
    ADD CONSTRAINT nickname_format CHECK (nickname ~* '^[a-zA-Z0-9_]{3,30}$');
  END IF;
END $$;

-- Create function to handle nickname case normalization
CREATE OR REPLACE FUNCTION public.handle_nickname_case()
RETURNS trigger AS $$
BEGIN
  IF NEW.nickname IS NOT NULL THEN
    NEW.nickname = LOWER(NEW.nickname);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for nickname case handling
CREATE TRIGGER enforce_nickname_case
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_nickname_case();

-- Update RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;

-- Create updated policies
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Public can insert profiles"
ON public.profiles FOR INSERT
TO anon, authenticated
WITH CHECK (true);