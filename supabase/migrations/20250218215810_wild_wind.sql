/*
  # Friends System Implementation

  1. New Tables
    - `friend_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `status` (request_status - pending/accepted/rejected/blocked)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `friends`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `friend_id` (uuid, references profiles)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for friend request management
    - Add policies for friends list access
*/

-- Create friend request status enum
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

-- Create friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status request_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Policies for friend_requests
CREATE POLICY "Users can see requests they've sent or received"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they've received"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Policies for friends
CREATE POLICY "Users can see their friends"
  ON friends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage friend relationships"
  ON friends
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Function to handle friend request acceptance
CREATE OR REPLACE FUNCTION handle_friend_request_acceptance()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create friend relationship for both users
    INSERT INTO friends (user_id, friend_id)
    VALUES
      (NEW.sender_id, NEW.receiver_id),
      (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend request acceptance
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_friend_request_acceptance();

-- Function to get friend count
CREATE OR REPLACE FUNCTION get_friend_count(user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM friends
  WHERE friends.user_id = $1;
$$;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM friends
    WHERE user_id = $1 AND friend_id = $2
  );
$$;

-- Function to get friend request status
CREATE OR REPLACE FUNCTION get_friend_request_status(user_id uuid, target_id uuid)
RETURNS request_status
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT status
  FROM friend_requests
  WHERE (sender_id = $1 AND receiver_id = $2)
     OR (sender_id = $2 AND receiver_id = $1)
  ORDER BY created_at DESC
  LIMIT 1;
$$;