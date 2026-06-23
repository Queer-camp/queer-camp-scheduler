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

  const { data: activity } = await supabase
    .from("activities")
    .select("id, camp_id, capacity, organizers")
    .eq("id", id)
    .single();
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isLeader = session.role === "leader";

  if (isLeader) {
    const { data: leader } = await supabase
      .from("admin_users")
      .select("name")
      .eq("id", session.adminId)
      .single();
    if (!leader?.name || !((activity.organizers as string[]) ?? []).includes(leader.name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: regs } = await supabase
    .from("registrations")
    .select("id, camper_id, campers(id, chosen_first_name, chosen_last_name, pronouns)")
    .eq("activity_id", id);

  type RegRow = { id: string; camper_id: string; campers: { id: string; chosen_first_name: string; chosen_last_name: string; pronouns: string | null } };
  const enrolled = ((regs as unknown as RegRow[]) ?? []).map(r => ({
    registration_id: r.id,
    id: r.campers.id,
    chosen_first_name: r.campers.chosen_first_name,
    chosen_last_name: r.campers.chosen_last_name,
    pronouns: r.campers.pronouns,
  }));

  if (isLeader) {
    return NextResponse.json({
      capacity: activity.capacity,
      enrolled: enrolled.length,
      campers: enrolled,
      available: [],
    });
  }

  const enrolledIds = new Set(enrolled.map(c => c.id));

  const { data: allCampers } = await supabase
    .from("campers")
    .select("id, chosen_first_name, chosen_last_name, pronouns")
    .eq("camp_id", activity.camp_id)
    .order("chosen_last_name");

  const available = (allCampers ?? []).filter(c => !enrolledIds.has(c.id));

  return NextResponse.json({
    capacity: activity.capacity,
    enrolled: enrolled.length,
    campers: enrolled,
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
  const { data, error } = await supabase
    .from("registrations")
    .insert({ camper_id, activity_id: id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Camper is already enrolled." }, { status: 409 });
    if (error.message?.includes("capacity")) return NextResponse.json({ error: "Activity is at capacity." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
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
    .from("registrations")
    .delete()
    .eq("activity_id", id)
    .eq("camper_id", camper_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
