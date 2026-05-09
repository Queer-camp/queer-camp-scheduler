import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campId = req.nextUrl.searchParams.get("camp_id");
  if (!campId) return NextResponse.json({ error: "camp_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("activities").select("*").eq("camp_id", campId).order("day").order("start_time");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activityIds = (data ?? []).map(a => a.id);
  const enrolledCounts: Record<string, number> = {};
  if (activityIds.length > 0) {
    const { data: regs } = await supabase.from("registrations").select("activity_id").in("activity_id", activityIds);
    for (const r of regs ?? []) enrolledCounts[r.activity_id] = (enrolledCounts[r.activity_id] ?? 0) + 1;
  }

  return NextResponse.json((data ?? []).map(a => ({ ...a, enrolled: enrolledCounts[a.id] ?? 0 })));
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { camp_id, name, description, capacity, day, start_time, end_time, emoji, series_id } = body;
  if (!camp_id || !name?.trim() || !capacity || !day?.trim() || !start_time || !end_time) {
    return NextResponse.json({ error: "camp_id, name, capacity, day, start_time, and end_time are required." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("activities").insert({
    camp_id, name: name.trim(), description: description?.trim() || null,
    capacity: Number(capacity), day: day.trim(), start_time, end_time,
    emoji: emoji?.trim() || null, series_id: series_id || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
