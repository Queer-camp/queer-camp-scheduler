-- Add `location` to standing_events (tracks and activities already have it via migration 006)
ALTER TABLE standing_events ADD COLUMN IF NOT EXISTS location text;

-- Add `organizer` to all three scheduled item types
ALTER TABLE tracks          ADD COLUMN IF NOT EXISTS organizer text;
ALTER TABLE activities      ADD COLUMN IF NOT EXISTS organizer text;
ALTER TABLE standing_events ADD COLUMN IF NOT EXISTS organizer text;
