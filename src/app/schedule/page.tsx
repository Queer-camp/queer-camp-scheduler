import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase";
import ScheduleView from "@/components/ScheduleView";
import { CookieSetter } from "./CookieSetter";
import type { ActivityWithSpots, TrackWithSpots, StandingEvent } from "@/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Schedule — Queer Camp" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token: urlToken } = await searchParams;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("camper_token")?.value;
  const token = urlToken || cookieToken;

  if (!token) {
    return <InvalidLink />;
  }

  const supabase = createAdminClient();

  const { data: camper } = await supabase
    .from("campers")
    .select("id, camp_id, chosen_first_name, chosen_last_name, pronouns, track_id")
    .eq("token", token)
    .single();

  if (!camper || !camper.camp_id) {
    return <InvalidLink />;
  }

  const campId = camper.camp_id;

  const [
    { data: registrations },
    { data: activities },
    { data: tracks },
    { data: series },
    { data: camp },
    { data: standingEvents },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("activity_id")
      .eq("camper_id", camper.id),
    supabase
      .from("activities")
      .select("*")
      .eq("camp_id", campId)
      .order("day")
      .order("start_time"),
    supabase
      .from("tracks")
      .select("*")
      .eq("camp_id", campId)
      .order("start_time"),
    supabase.from("activity_series").select("*").eq("camp_id", campId),
    supabase.from("camps").select("name").eq("id", campId).single(),
    supabase.from("standing_events").select("*").eq("camp_id", campId).order("start_time"),
  ]);

  const activityIds = (activities ?? []).map((a) => a.id);
  const [{ data: regCounts }, { data: trackCampers }] = await Promise.all([
    activityIds.length
      ? supabase
          .from("registrations")
          .select("activity_id")
          .in("activity_id", activityIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("campers")
      .select("track_id")
      .eq("camp_id", campId)
      .not("track_id", "is", null),
  ]);

  const regCountByActivity: Record<string, number> = {};
  for (const r of regCounts ?? []) {
    regCountByActivity[r.activity_id] =
      (regCountByActivity[r.activity_id] ?? 0) + 1;
  }

  const camperCountByTrack: Record<string, number> = {};
  for (const c of trackCampers ?? []) {
    if (c.track_id) {
      camperCountByTrack[c.track_id] =
        (camperCountByTrack[c.track_id] ?? 0) + 1;
    }
  }

  const activitiesWithSpots: ActivityWithSpots[] = (activities ?? []).map(
    (a) => ({ ...a, spots_left: a.capacity - (regCountByActivity[a.id] ?? 0) })
  );

  const tracksWithSpots: TrackWithSpots[] = (tracks ?? []).map((t) => ({
    ...t,
    spots_left: t.capacity - (camperCountByTrack[t.id] ?? 0),
  }));

  const registeredActivityIds = (registrations ?? []).map(
    (r) => r.activity_id
  );

  return (
    <>
      {/* Set cookie silently when arriving via magic link URL */}
      {urlToken && <CookieSetter token={urlToken} />}
      <ScheduleView
        token={token}
        camper={camper}
        campName={camp?.name ?? "Camp"}
        registeredActivityIds={registeredActivityIds}
        activities={activitiesWithSpots}
        tracks={tracksWithSpots}
        series={series ?? []}
        standingEvents={(standingEvents ?? []) as StandingEvent[]}
      />
    </>
  );
}

function InvalidLink() {
  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-3">Link not found</h1>
      <p className="text-gray-600 mb-6">
        This link is invalid or has expired. Try requesting a new one.
      </p>
      <a href="/get-link" className="underline text-sm">
        Get a new link →
      </a>
    </div>
  );
}
