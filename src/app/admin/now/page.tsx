import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminFromCookies } from "@/lib/admin-auth";
import { NowDashboard, type NowData, type RosterCamper } from "@/components/admin/NowDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Right Now — Queer Camp Admin" };

type CamperRow = { id: string; chosen_first_name: string; chosen_last_name: string; pronouns: string | null; track_id: string | null };

export default async function NowPage() {
  const session = await requireAdminFromCookies();
  if (!session) redirect("/admin");

  const supabase = createAdminClient();

  const { data: camp } = await supabase
    .from("camps")
    .select("id, name, start_date, end_date")
    .eq("is_active", true)
    .maybeSingle();

  if (!camp) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Right Now</h1>
        <p className="text-gray-500 dark:text-gray-400">No camp is currently active.</p>
      </div>
    );
  }

  const [{ data: tracks }, { data: activities }, { data: standingEvents }, { data: campers }, { data: regs }] = await Promise.all([
    supabase.from("tracks").select("*").eq("camp_id", camp.id).order("start_time"),
    supabase.from("activities").select("*").eq("camp_id", camp.id).order("start_time"),
    supabase.from("standing_events").select("*").eq("camp_id", camp.id).order("start_time"),
    supabase.from("campers").select("id, chosen_first_name, chosen_last_name, pronouns, track_id").eq("camp_id", camp.id),
    supabase.from("registrations").select("camper_id, activity_id"),
  ]);

  const camperById = new Map<string, CamperRow>();
  for (const c of (campers ?? []) as CamperRow[]) camperById.set(c.id, c);

  const trackRosters: Record<string, RosterCamper[]> = {};
  for (const t of tracks ?? []) trackRosters[t.id] = [];
  for (const c of (campers ?? []) as CamperRow[]) {
    if (c.track_id && trackRosters[c.track_id]) {
      trackRosters[c.track_id].push({ id: c.id, name: `${c.chosen_first_name} ${c.chosen_last_name}`, pronouns: c.pronouns });
    }
  }

  const activityRosters: Record<string, RosterCamper[]> = {};
  for (const a of activities ?? []) activityRosters[a.id] = [];
  for (const r of regs ?? []) {
    const c = camperById.get(r.camper_id);
    if (c && activityRosters[r.activity_id]) {
      activityRosters[r.activity_id].push({ id: c.id, name: `${c.chosen_first_name} ${c.chosen_last_name}`, pronouns: c.pronouns });
    }
  }

  const data: NowData = {
    campName: camp.name,
    campStartDate: camp.start_date,
    campEndDate: camp.end_date,
    totalCampers: campers?.length ?? 0,
    tracks: (tracks ?? []).map(t => ({ ...t, campers: trackRosters[t.id] ?? [] })),
    activities: (activities ?? []).map(a => ({ ...a, campers: activityRosters[a.id] ?? [] })),
    standingEvents: standingEvents ?? [],
  };

  return <NowDashboard data={data} />;
}
