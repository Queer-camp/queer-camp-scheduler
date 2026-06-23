import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/camps/[id]/free-campers?day=Monday&start=13:30&end=14:40
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campId } = await params;
  const day = req.nextUrl.searchParams.get("day");
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!day || !start || !end) return NextResponse.json({ error: "day, start, and end are required" }, { status: 400 });

  const supabase = createAdminClient();

  const [{ data: allCampers }, { data: overlappingTracks }, { data: overlappingActivities }] = await Promise.all([
    supabase
      .from("campers")
      .select("id, chosen_first_name, chosen_last_name, pronouns, track_id")
      .eq("camp_id", campId)
      .order("chosen_last_name"),
    // Tracks run every camp day — just check time overlap
    supabase
      .from("tracks")
      .select("id")
      .eq("camp_id", campId)
      .lt("start_time", end)
      .gt("end_time", start),
    // Activities must overlap both day and time
    supabase
      .from("activities")
      .select("id")
      .eq("camp_id", campId)
      .ilike("day", `%${day}%`)
      .lt("start_time", end)
      .gt("end_time", start),
  ]);

  const trackIds = new Set((overlappingTracks ?? []).map(t => t.id));
  const activityIds = (overlappingActivities ?? []).map(a => a.id);

  const busyIds = new Set<string>();

  // Campers assigned to an overlapping track
  for (const c of allCampers ?? []) {
    if (c.track_id && trackIds.has(c.track_id)) busyIds.add(c.id);
  }

  // Campers registered for an overlapping activity
  if (activityIds.length > 0) {
    const { data: regs } = await supabase
      .from("registrations")
      .select("camper_id")
      .in("activity_id", activityIds);
    for (const r of regs ?? []) busyIds.add(r.camper_id);
  }

  const freeCampers = (allCampers ?? [])
    .filter(c => !busyIds.has(c.id))
    .map(c => ({ id: c.id, name: `${c.chosen_first_name} ${c.chosen_last_name}`, pronouns: c.pronouns }));

  return NextResponse.json({ freeCampers, total: allCampers?.length ?? 0 });
}
