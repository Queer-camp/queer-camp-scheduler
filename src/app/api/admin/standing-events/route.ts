import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campId = req.nextUrl.searchParams.get("camp_id");
  if (!campId) return NextResponse.json({ error: "camp_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("standing_events")
    .select("*")
    .eq("camp_id", campId)
    .order("start_time");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { camp_id, name, day, start_time, end_time, emoji, location, organizers } = body;
  if (!camp_id || !name?.trim() || !day?.trim() || !start_time || !end_time) {
    return NextResponse.json({ error: "camp_id, name, day, start_time, and end_time are required." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("standing_events")
    .insert({
      camp_id, name: name.trim(), day: day.trim(), start_time, end_time,
      emoji: emoji?.trim() || null,
      location: location?.trim() || null,
      organizers: Array.isArray(organizers) ? organizers : [],
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
