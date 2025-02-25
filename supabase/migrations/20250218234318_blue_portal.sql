/*
  # Create Challenge System Tables
  
  1. New Tables
    - challenges
      - Basic challenge information and settings
    - challenge_participants
      - Tracks who is participating in each challenge
    - challenge_activities
      - Logs activities and points for each participant
    - challenge_invites
      - Tracks invitations to join challenges
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create challenge types enum
CREATE TYPE challenge_type AS ENUM (
  'race',      -- Race to finish line
  'survival',  -- Elimination rounds
  'streak',    -- Longest streak wins
  'custom'     -- Custom rules
);

-- Create challenge status enum
CREATE TYPE challenge_status AS ENUM (
  'draft',     -- Being created/edited
  'active',    -- Currently running
  'completed', -- Finished
  'cancelled'  -- Cancelled before completion
);

-- Create challenges table
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  challenge_type challenge_type NOT NULL,
  status challenge_status DEFAULT 'draft',
  start_date timestamptz,
  end_date timestamptz,
  is_private boolean DEFAULT false,
  rules jsonb NOT NULL DEFAULT '{
    "allowed_activities": ["walking", "running"],
    "points_per_activity": {},
    "finish_line": null,
    "minimum_threshold": null,
    "streak_bonus": null,
    "custom_rules": null
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date IS NOT NULL AND (end_date IS NULL OR end_date > start_date))
  )
);

-- Create challenge participants table
CREATE TABLE challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  total_points int DEFAULT 0,
  last_activity_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'withdrawn')),
  UNIQUE(challenge_id, user_id)
);

-- Create challenge activities table
CREATE TABLE challenge_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  points int NOT NULL,
  bonus_points int DEFAULT 0,
  penalty_points int DEFAULT 0,
  recorded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create challenge invites table
CREATE TABLE challenge_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, receiver_id)
);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_invites ENABLE ROW LEVEL SECURITY;

-- Challenges policies
CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view public challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (NOT is_private OR creator_id = auth.uid());

CREATE POLICY "Creators can update their challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Challenge participants policies
CREATE POLICY "Users can view challenge participants"
  ON challenge_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE id = challenge_id
      AND (NOT is_private OR creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM challenges
      WHERE id = challenge_id
      AND (
        NOT is_private OR
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM challenge_invites
          WHERE challenge_id = challenges.id
          AND receiver_id = auth.uid()
          AND status = 'accepted'
        )
      )
    )
  );

-- Challenge activities policies
CREATE POLICY "Users can log their own activities"
  ON challenge_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM challenge_participants
      WHERE challenge_id = challenge_activities.challenge_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Users can view challenge activities"
  ON challenge_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE id = challenge_id
      AND (NOT is_private OR creator_id = auth.uid())
    )
  );

-- Challenge invites policies
CREATE POLICY "Users can view their invites"
  ON challenge_invites FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid()
  );

CREATE POLICY "Users can send invites"
  ON challenge_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM challenges
      WHERE id = challenge_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can respond to their invites"
  ON challenge_invites FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Function to update challenge participant stats
CREATE OR REPLACE FUNCTION update_challenge_participant_stats()
RETURNS trigger AS $$
BEGIN
  -- Update total points
  UPDATE challenge_participants
  SET total_points = (
    SELECT COALESCE(SUM(points + bonus_points - penalty_points), 0)
    FROM challenge_activities
    WHERE challenge_id = NEW.challenge_id
    AND user_id = NEW.user_id
  ),
  last_activity_date = NEW.recorded_at
  WHERE challenge_id = NEW.challenge_id
  AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats on activity log
CREATE TRIGGER on_challenge_activity_logged
  AFTER INSERT ON challenge_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_participant_stats();

-- Function to handle challenge completion
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS trigger AS $$
BEGIN
  -- If challenge is completed, update participant stats one final time
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    UPDATE challenge_participants
    SET status = 'completed'
    WHERE challenge_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for challenge completion
CREATE TRIGGER on_challenge_completed
  AFTER UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();