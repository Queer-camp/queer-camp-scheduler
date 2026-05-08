export interface Camper {
  id: string;
  camp_id: string;
  chosen_first_name: string;
  chosen_last_name: string;
  legal_first_name: string;
  legal_last_name: string;
  pronouns: string | null;
  email: string;
  track_id: string | null;
  token: string;
  created_at: string;
  updated_at: string;
}

export interface Camp {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  camp_id: string;
  name: string;
  description: string | null;
  capacity: number;
  start_time: string;
  end_time: string;
  emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivitySeries {
  id: string;
  camp_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  camp_id: string;
  name: string;
  description: string | null;
  capacity: number;
  day: string;
  start_time: string;
  end_time: string;
  emoji: string | null;
  series_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  camper_id: string;
  activity_id: string;
  created_at: string;
}

// ── View types with computed fields ──────────────────────────────────────────

export interface ActivityWithSpots extends Activity {
  spots_left: number;
}

export interface TrackWithSpots extends Track {
  spots_left: number;
}
