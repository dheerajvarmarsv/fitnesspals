-- Add notifications_enabled column with default false if it doesn't exist
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

-- Make sure the push_token column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'profile_settings' AND column_name = 'push_token'
    ) THEN
        ALTER TABLE profile_settings ADD COLUMN push_token TEXT;
    END IF;
END $$;

-- Add an index to make lookups by push_token faster
CREATE INDEX IF NOT EXISTS idx_profile_settings_push_token ON profile_settings(push_token) 
WHERE push_token IS NOT NULL;