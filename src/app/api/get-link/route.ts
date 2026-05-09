import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendScheduleLink } from "@/lib/email";
import { getActiveCampId } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const campId = await getActiveCampId();
  const supabase = createAdminClient();

  const query = supabase
    .from("campers")
    .select("token, chosen_first_name, chosen_last_name")
    .eq("email", email.trim().toLowerCase());

  if (campId) query.eq("camp_id", campId);

  const { data: camper } = await query.single();

  if (camper) {
    const scheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/schedule?token=${camper.token}`;
    const displayName = `${camper.chosen_first_name} ${camper.chosen_last_name}`;

    try {
      await sendScheduleLink({ to: email.trim(), displayName, scheduleUrl });
    } catch (err) {
      console.error("Failed to send schedule link email:", err);
      // Don't expose the error — return success so we don't leak registration status
    }
  }

  // Always return 200 — don't reveal whether the email is registered
  return NextResponse.json({ ok: true });
}
