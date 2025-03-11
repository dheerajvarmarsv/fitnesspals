-- First create the enum type for fitness data sources
CREATE TYPE fitness_data_source AS ENUM ('manual', 'google_fit', 'apple_health', 'fitbit', 'other');

-- Update existing records to ensure they match enum values
-- This assumes 'manual' is a safe default for existing records
UPDATE activities 
SET source = 'manual' 
WHERE source IS NULL OR source NOT IN ('manual', 'google_fit', 'apple_health', 'fitbit', 'other');

-- Now do the column conversion in two steps
-- Step 1: Add a new column of the enum type
ALTER TABLE activities ADD COLUMN source_enum fitness_data_source;

-- Step 2: Populate the new column with values from the old column
UPDATE activities SET source_enum = source::fitness_data_source;

-- Step 3: Drop the original column and rename the new one
ALTER TABLE activities DROP COLUMN source;
ALTER TABLE activities RENAME COLUMN source_enum TO source;

-- Enhance user_fitness_connections with additional tracking fields
ALTER TABLE user_fitness_connections 
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_count INTEGER;

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fitness_activities_user_date ON fitness_activities(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_data(user_id, date);

-- Create tables for fitness activities if they don't exist
CREATE TABLE IF NOT EXISTS fitness_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source fitness_data_source NOT NULL DEFAULT 'manual',
  activity_type TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER, -- in minutes
  distance FLOAT,
  calories INTEGER,
  heart_rate INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source fitness_data_source NOT NULL DEFAULT 'manual',
  date DATE NOT NULL,
  steps INTEGER,
  distance FLOAT,
  calories INTEGER,
  heart_rate FLOAT,
  sleep_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_fitness_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_fitness_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type fitness_data_source NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT false,
  status TEXT,
  last_synced TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  last_sync_error TEXT,
  last_sync_count INTEGER,
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, type)
);

-- Add RLS policies for fitness-related tables
ALTER TABLE fitness_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fitness_connections ENABLE ROW LEVEL SECURITY;

-- RLS for fitness_activities
CREATE POLICY "Users can view their own fitness activities" 
  ON fitness_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness activities" 
  ON fitness_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness activities" 
  ON fitness_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness activities" 
  ON fitness_activities FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for health_data
CREATE POLICY "Users can view their own health data" 
  ON health_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health data" 
  ON health_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health data" 
  ON health_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health data" 
  ON health_data FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for user_fitness_connections
CREATE POLICY "Users can view their own fitness connections" 
  ON user_fitness_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness connections" 
  ON user_fitness_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness connections" 
  ON user_fitness_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness connections" 
  ON user_fitness_connections FOR DELETE
  USING (auth.uid() = user_id);