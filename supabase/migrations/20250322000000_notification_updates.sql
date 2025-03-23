-- Add notifications_enabled column with default false
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

-- Update push_token column comment
COMMENT ON COLUMN profile_settings.push_token IS 'Expo push notification token for this device';

-- Add explicit index for faster lookups by push_token
CREATE INDEX IF NOT EXISTS profile_settings_push_token_idx ON profile_settings(push_token) WHERE push_token IS NOT NULL;

-- Create function to send server-side notifications (will be used with triggers)
CREATE OR REPLACE FUNCTION notify_friend_request_received()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be triggered when a new friend_request is created
  -- In a real implementation, you'd have an API call to a notification service
  -- For now, we'll just log the event for demonstration
  
  -- Insert a log of the notification attempt
  INSERT INTO notification_logs (
    event_type,
    recipient_id,
    sender_id,
    resource_id,
    message
  ) VALUES (
    'friend_request',
    NEW.receiver_id,
    NEW.sender_id,
    NEW.id,
    format('Friend request from user %s to %s', NEW.sender_id, NEW.receiver_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a notification_logs table for debugging/auditing
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  resource_id UUID,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_recipient_id
    FOREIGN KEY (recipient_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_sender_id
    FOREIGN KEY (sender_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Create trigger for friend request notifications
DROP TRIGGER IF EXISTS on_friend_request_created ON friend_requests;
CREATE TRIGGER on_friend_request_created
AFTER INSERT ON friend_requests
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_friend_request_received();