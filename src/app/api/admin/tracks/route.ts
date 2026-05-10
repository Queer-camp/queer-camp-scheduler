import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campId = req.nextUrl.searchParams.get("camp_id");
  if (!campId) return NextResponse.json({ error: "camp_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tracks").select("*").eq("camp_id", campId).order("start_time");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const trackIds = (data ?? []).map(t => t.id);
  const enrolledCounts: Record<string, number> = {};
  if (trackIds.length > 0) {
    const { data: camperRows } = await supabase.from("campers").select("track_id").in("track_id", trackIds);
    for (const c of camperRows ?? []) if (c.track_id) enrolledCounts[c.track_id] = (enrolledCounts[c.track_id] ?? 0) + 1;
  }

  return NextResponse.json((data ?? []).map(t => ({ ...t, enrolled: enrolledCounts[t.id] ?? 0 })));
}

export async function POST(req: NextRequest) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { camp_id, name, description, capacity, start_time, end_time, emoji, location, organizer } = body;
  if (!camp_id || !name?.trim() || !capacity || !start_time || !end_time) {
    return NextResponse.json({ error: "camp_id, name, capacity, start_time, and end_time are required." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tracks").insert({
    camp_id, name: name.trim(), description: description?.trim() || null,
    capacity: Number(capacity), start_time, end_time, emoji: emoji?.trim() || null,
    location: location?.trim() || null,
    organizer: organizer?.trim() || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
