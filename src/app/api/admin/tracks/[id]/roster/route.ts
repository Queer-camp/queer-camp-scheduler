import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: track } = await supabase
    .from("tracks")
    .select("id, camp_id, capacity, organizers")
    .eq("id", id)
    .single();
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isLeader = session.role === "leader";

  if (isLeader) {
    const { data: leader } = await supabase
      .from("admin_users")
      .select("name")
      .eq("id", session.adminId)
      .single();
    if (!leader?.name || !((track.organizers as string[]) ?? []).includes(leader.name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: enrolled } = await supabase
    .from("campers")
    .select("id, chosen_first_name, chosen_last_name, pronouns")
    .eq("track_id", id)
    .order("chosen_last_name");

  if (isLeader) {
    return NextResponse.json({
      capacity: track.capacity,
      enrolled: enrolled?.length ?? 0,
      campers: enrolled ?? [],
      available: [],
    });
  }

  const [{ data: allCampers }, { data: allTracks }] = await Promise.all([
    supabase
      .from("campers")
      .select("id, chosen_first_name, chosen_last_name, pronouns, track_id")
      .eq("camp_id", track.camp_id)
      .order("chosen_last_name"),
    supabase
      .from("tracks")
      .select("id, name")
      .eq("camp_id", track.camp_id),
  ]);

  const trackNameMap = Object.fromEntries((allTracks ?? []).map(t => [t.id, t.name]));
  const enrolledSet = new Set((enrolled ?? []).map(c => c.id));

  const available = (allCampers ?? [])
    .filter(c => !enrolledSet.has(c.id))
    .map(c => ({
      id: c.id,
      chosen_first_name: c.chosen_first_name,
      chosen_last_name: c.chosen_last_name,
      pronouns: c.pronouns,
      current_track_name: c.track_id ? (trackNameMap[c.track_id] ?? null) : null,
    }));

  return NextResponse.json({
    capacity: track.capacity,
    enrolled: enrolled?.length ?? 0,
    campers: enrolled ?? [],
    available,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { camper_id } = await req.json();
  if (!camper_id) return NextResponse.json({ error: "camper_id required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: track } = await supabase.from("tracks").select("capacity").eq("id", id).single();
  const { count } = await supabase.from("campers").select("id", { count: "exact", head: true }).eq("track_id", id);
  if (track && count !== null && count >= track.capacity) {
    return NextResponse.json({ error: "Track is at capacity." }, { status: 409 });
  }

  const { error } = await supabase.from("campers").update({ track_id: id }).eq("id", camper_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { camper_id } = await req.json();
  if (!camper_id) return NextResponse.json({ error: "camper_id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("campers")
    .update({ track_id: null })
    .eq("id", camper_id)
    .eq("track_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
