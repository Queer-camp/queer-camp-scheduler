import { createAdminClient } from "@/lib/supabase";
import { CAMP_ID } from "@/lib/constants";
import RegistrationForm from "@/components/RegistrationForm";
import type { ActivityWithSpots, TrackWithSpots } from "@/types/database";

export const metadata = { title: "Register — Queer Camp" };

export default async function RegisterPage() {
  const supabase = createAdminClient();

  // Fetch base data in parallel; registration counts need activity IDs first
  const [
    { data: activities, error: actErr },
    { data: tracks },
    { data: series },
    { data: camp },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("camp_id", CAMP_ID)
      .order("day")
      .order("start_time"),
    supabase
      .from("tracks")
      .select("*")
      .eq("camp_id", CAMP_ID)
      .order("start_time"),
    supabase.from("activity_series").select("*").eq("camp_id", CAMP_ID),
    supabase
      .from("camps")
      .select("name, registration_open")
      .eq("id", CAMP_ID)
      .single(),
  ]);

  if (actErr) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-red-600">
        Failed to load registration. Please try again later.
      </div>
    );
  }

  if (camp && !camp.registration_open) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-2">{camp.name}</h1>
        <p className="text-gray-600">Registration is currently closed.</p>
      </div>
    );
  }

  // Fetch registration + track occupancy counts using admin client
  const activityIds = (activities ?? []).map((a) => a.id);
  const [{ data: regRows }, { data: trackCamperRows }] = await Promise.all([
    activityIds.length
      ? supabase
          .from("registrations")
          .select("activity_id")
          .in("activity_id", activityIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("campers")
      .select("track_id")
      .eq("camp_id", CAMP_ID)
      .not("track_id", "is", null),
  ]);

  // Build spots_left counts
  const regCountByActivity: Record<string, number> = {};
  for (const r of regRows ?? []) {
    regCountByActivity[r.activity_id] =
      (regCountByActivity[r.activity_id] ?? 0) + 1;
  }

  const camperCountByTrack: Record<string, number> = {};
  for (const c of trackCamperRows ?? []) {
    if (c.track_id) {
      camperCountByTrack[c.track_id] =
        (camperCountByTrack[c.track_id] ?? 0) + 1;
    }
  }

  const activitiesWithSpots: ActivityWithSpots[] = (activities ?? []).map(
    (a) => ({
      ...a,
      spots_left: a.capacity - (regCountByActivity[a.id] ?? 0),
    })
  );

  const tracksWithSpots: TrackWithSpots[] = (tracks ?? []).map((t) => ({
    ...t,
    spots_left: t.capacity - (camperCountByTrack[t.id] ?? 0),
  }));

  return (
    <RegistrationForm
      activities={activitiesWithSpots}
      tracks={tracksWithSpots}
      series={series ?? []}
      campName={camp?.name ?? "Camp"}
    />
  );
}
