import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminRole(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sourceCampId } = await params;
  const supabase = createAdminClient();

  // Fetch source camp
  const { data: source, error: campErr } = await supabase
    .from("camps")
    .select("*")
    .eq("id", sourceCampId)
    .single();

  if (campErr || !source) {
    return NextResponse.json({ error: "Camp not found." }, { status: 404 });
  }

  // Create new camp (registration closed, not active, not archived)
  const { data: newCamp, error: newCampErr } = await supabase
    .from("camps")
    .insert({
      name: `Copy of ${source.name}`,
      start_date: source.start_date,
      end_date: source.end_date,
      registration_open: false,
      is_active: false,
      archived: false,
    })
    .select()
    .single();

  if (newCampErr || !newCamp) {
    return NextResponse.json({ error: newCampErr?.message ?? "Failed to create camp." }, { status: 500 });
  }

  // Fetch source data in parallel
  const [{ data: sourceSeries }, { data: sourceTracks }, { data: sourceActivities }] = await Promise.all([
    supabase.from("activity_series").select("*").eq("camp_id", sourceCampId),
    supabase.from("tracks").select("*").eq("camp_id", sourceCampId),
    supabase.from("activities").select("*").eq("camp_id", sourceCampId),
  ]);

  // Clone series and build old→new ID map
  const seriesIdMap: Record<string, string> = {};
  if (sourceSeries && sourceSeries.length > 0) {
    const { data: newSeries } = await supabase
      .from("activity_series")
      .insert(sourceSeries.map(s => ({ camp_id: newCamp.id, name: s.name, description: s.description })))
      .select();
    if (newSeries) {
      sourceSeries.forEach((s, i) => { seriesIdMap[s.id] = newSeries[i].id; });
    }
  }

  // Clone tracks
  if (sourceTracks && sourceTracks.length > 0) {
    await supabase.from("tracks").insert(
      sourceTracks.map(t => ({
        camp_id: newCamp.id, name: t.name, description: t.description,
        capacity: t.capacity, start_time: t.start_time, end_time: t.end_time, emoji: t.emoji,
      }))
    );
  }

  // Clone activities (remap series_id)
  if (sourceActivities && sourceActivities.length > 0) {
    await supabase.from("activities").insert(
      sourceActivities.map(a => ({
        camp_id: newCamp.id, name: a.name, description: a.description,
        capacity: a.capacity, day: a.day, start_time: a.start_time, end_time: a.end_time,
        emoji: a.emoji, series_id: a.series_id ? (seriesIdMap[a.series_id] ?? null) : null,
      }))
    );
  }

  return NextResponse.json({ id: newCamp.id }, { status: 201 });
}
