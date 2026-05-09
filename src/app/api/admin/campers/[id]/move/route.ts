import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { camp_id } = await req.json();
  if (!camp_id) return NextResponse.json({ error: "camp_id required" }, { status: 400 });

  const supabase = createAdminClient();

  // Delete all registrations for this camper
  await supabase.from("registrations").delete().eq("camper_id", id);

  // Move to new camp, clear track
  const { data, error } = await supabase
    .from("campers")
    .update({ camp_id, track_id: null })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
