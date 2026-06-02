-- Convert organizer (single text) → organizers (text array) on all three event tables.
-- Existing single-value data is preserved as a one-element array.

ALTER TABLE tracks          RENAME COLUMN organizer TO organizers;
ALTER TABLE activities      RENAME COLUMN organizer TO organizers;
ALTER TABLE standing_events RENAME COLUMN organizer TO organizers;

ALTER TABLE tracks
  ALTER COLUMN organizers TYPE text[]
  USING CASE WHEN organizers IS NOT NULL AND organizers <> '' THEN ARRAY[organizers] ELSE '{}' END;

ALTER TABLE activities
  ALTER COLUMN organizers TYPE text[]
  USING CASE WHEN organizers IS NOT NULL AND organizers <> '' THEN ARRAY[organizers] ELSE '{}' END;

ALTER TABLE standing_events
  ALTER COLUMN organizers TYPE text[]
  USING CASE WHEN organizers IS NOT NULL AND organizers <> '' THEN ARRAY[organizers] ELSE '{}' END;
