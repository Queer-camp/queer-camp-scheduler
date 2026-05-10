import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { token, activity_ids, track_id } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify token → get camper
  const { data: camper, error: camperErr } = await supabase
    .from("campers")
    .select("id")
    .eq("token", token)
    .single();

  if (camperErr || !camper) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }

  const newIds: string[] = Array.isArray(activity_ids)
    ? activity_ids.filter((id: unknown) => typeof id === "string")
    : [];

  // Get current registrations to compute delta
  const { data: current } = await supabase
    .from("registrations")
    .select("activity_id")
    .eq("camper_id", camper.id);

  const currentIds = new Set((current ?? []).map((r) => r.activity_id));
  const newIdSet = new Set(newIds);

  const toAdd = newIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !newIdSet.has(id));

  // Insert additions first — DB trigger will reject if any slot is full
  if (toAdd.length > 0) {
    const { error: addErr } = await supabase.from("registrations").insert(
      toAdd.map((activity_id) => ({ camper_id: camper.id, activity_id }))
    );

    if (addErr) {
      console.error("Registration add error:", addErr);
      return NextResponse.json(
        {
          error:
            "One or more activities filled up just now. Please go back and re-select.",
        },
        { status: 409 }
      );
    }
  }

  // Remove dropped registrations
  if (toRemove.length > 0) {
    await supabase
      .from("registrations")
      .delete()
      .eq("camper_id", camper.id)
      .in("activity_id", toRemove);
  }

  // Update track selection
  await supabase
    .from("campers")
    .update({ track_id: track_id ?? null })
    .eq("id", camper.id);

  return NextResponse.json({ ok: true });
}
