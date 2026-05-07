export interface Camper {
  id: string;
  camp_id: string;
  legal_first_name: string;
  legal_last_name: string;
  chosen_name: string | null;
  pronouns: string | null;
  email: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_email: string;
  guardian_phone: string;
  guardian_relationship: string;
  emergency_same_as_guardian: boolean;
  emergency_first_name: string | null;
  emergency_last_name: string | null;
  emergency_phone: string | null;
  emergency_relationship: string | null;
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
