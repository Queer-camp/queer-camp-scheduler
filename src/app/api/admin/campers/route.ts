import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { sendScheduleLink } from "@/lib/email";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campId = req.nextUrl.searchParams.get("camp_id");
  const supabase = createAdminClient();

  let query = supabase
    .from("campers")
    .select(`
      id, chosen_first_name, chosen_last_name, pronouns, email, track_id, camp_id, created_at,
      camps ( name ),
      tracks ( name ),
      registrations ( id )
    `)
    .order("chosen_last_name", { ascending: true });

  if (campId) {
    query = query.eq("camp_id", campId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { camp_id, chosen_first_name, chosen_last_name, legal_first_name, legal_last_name, pronouns, email } = body;

  if (!camp_id || !chosen_first_name?.trim() || !chosen_last_name?.trim() || !legal_first_name?.trim() || !legal_last_name?.trim()) {
    return NextResponse.json({ error: "Camp, chosen name, and legal name are required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const token = crypto.randomBytes(32).toString("hex");

  const { data: camper, error: insertErr } = await supabase
    .from("campers")
    .insert({
      camp_id,
      chosen_first_name: chosen_first_name.trim(),
      chosen_last_name: chosen_last_name.trim(),
      legal_first_name: legal_first_name.trim(),
      legal_last_name: legal_last_name.trim(),
      pronouns: pronouns?.trim() || null,
      email: email?.trim().toLowerCase() || null,
      token,
    })
    .select()
    .single();

  if (insertErr || !camper) {
    return NextResponse.json({ error: insertErr?.message ?? "Failed to create camper." }, { status: 500 });
  }

  // Send schedule link if email provided
  if (camper.email) {
    const scheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/schedule?token=${token}`;
    try {
      await sendScheduleLink({
        to: camper.email,
        displayName: `${camper.chosen_first_name} ${camper.chosen_last_name}`,
        scheduleUrl,
      });
    } catch (err) {
      console.error("Failed to send schedule email:", err);
    }
  }

  return NextResponse.json(camper, { status: 201 });
}
