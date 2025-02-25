/*
  # Add Activities Table

  1. New Tables
    - `activities` - Stores user activity records
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `activity_type` (text)
      - `duration` (integer, minutes)
      - `distance` (float, kilometers)
      - `calories` (integer)
      - `notes` (text)
      - `source` (text, 'manual' or 'device')
      - `device_type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `activities` table
    - Add policies for authenticated users to:
      - Create their own activities
      - Read their own activities
      - Update their own activities
*/

-- Create activities table
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  distance float,
  calories integer,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'device')),
  device_type text,
  created_at timestamptz DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN ('walking', 'running', 'cycling', 'swimming', 'hiking', 'yoga')
  ),
  CONSTRAINT valid_distance CHECK (distance IS NULL OR distance > 0),
  CONSTRAINT valid_calories CHECK (calories IS NULL OR calories > 0),
  CONSTRAINT valid_device_type CHECK (
    device_type IS NULL OR 
    device_type IN ('apple', 'google', 'fitbit')
  )
);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own activities"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX activities_user_id_created_at_idx 
  ON activities(user_id, created_at DESC);

-- Create function to calculate activity stats
CREATE OR REPLACE FUNCTION get_user_activity_stats(
  user_id uuid,
  start_date timestamptz DEFAULT '-infinity'::timestamptz,
  end_date timestamptz DEFAULT 'infinity'::timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_activities', COUNT(*),
    'total_duration', COALESCE(SUM(duration), 0),
    'total_distance', COALESCE(SUM(distance), 0),
    'total_calories', COALESCE(SUM(calories), 0),
    'activities_by_type', (
      SELECT json_object_agg(
        activity_type,
        COUNT(*)
      )
      FROM activities a2
      WHERE a2.user_id = get_user_activity_stats.user_id
      AND a2.created_at BETWEEN start_date AND end_date
      GROUP BY activity_type
    )
  )
  INTO result
  FROM activities
  WHERE activities.user_id = get_user_activity_stats.user_id
  AND created_at BETWEEN start_date AND end_date;
  
  RETURN result;
END;
$$;