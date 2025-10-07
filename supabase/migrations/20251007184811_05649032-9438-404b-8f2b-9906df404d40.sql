-- Add new property statuses for tracking
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'Tracking';
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'Not Relevant';
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'Follow Up';
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'Waiting for Response';

-- Add new activity types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'offer', 'follow_up', 'viewing', 'other');
  ELSE
    -- Add new values if the type exists
    ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'offer';
    ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'follow_up';
    ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'viewing';
  END IF;
END $$;