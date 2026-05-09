-- Add location field to tracks and activities
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS location text;
