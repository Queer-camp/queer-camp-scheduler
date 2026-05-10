-- Standing events: camp-wide time blocks (meals, ceremonies, etc.) that appear for all campers
CREATE TABLE standing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID REFERENCES camps(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  day TEXT NOT NULL,         -- comma-separated day names, same format as activities
  start_time TEXT NOT NULL,  -- HH:MM
  end_time TEXT NOT NULL,    -- HH:MM
  emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON standing_events(camp_id);
