import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session";

async function requireAdminRole(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminRole(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  const allowed = ["name", "start_date", "end_date", "registration_open", "is_active", "archived"];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from("camps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminRole(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Only allow deleting archived camps
  const { data: camp } = await supabase.from("camps").select("archived").eq("id", id).single();
  if (!camp?.archived) {
    return NextResponse.json({ error: "Only archived camps can be deleted." }, { status: 400 });
  }

  // Delete child records in dependency order
  const activityIds = await supabase.from("activities").select("id").eq("camp_id", id);
  const ids = (activityIds.data ?? []).map(a => a.id);
  if (ids.length) await supabase.from("registrations").delete().in("activity_id", ids);

  const camperIds = await supabase.from("campers").select("id").eq("camp_id", id);
  const cids = (camperIds.data ?? []).map(c => c.id);
  if (cids.length) await supabase.from("registrations").delete().in("camper_id", cids);

  await supabase.from("campers").delete().eq("camp_id", id);
  await supabase.from("activities").delete().eq("camp_id", id);
  await supabase.from("tracks").delete().eq("camp_id", id);
  await supabase.from("activity_series").delete().eq("camp_id", id);
  await supabase.from("camps").delete().eq("id", id);

  return new NextResponse(null, { status: 204 });
}
