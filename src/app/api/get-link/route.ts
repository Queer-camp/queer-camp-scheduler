import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CAMP_ID } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: camper } = await supabase
    .from("campers")
    .select("token, chosen_name, legal_first_name")
    .eq("email", email.trim().toLowerCase())
    .eq("camp_id", CAMP_ID)
    .single();

  if (camper) {
    const scheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/schedule?token=${camper.token}`;
    const displayName = camper.chosen_name || camper.legal_first_name;

    // TODO: Replace console.log with Nodemailer send once SMTP credentials arrive.
    // Send to: email, subject: "Your Queer Camp schedule link"
    // Body should include scheduleUrl and displayName.
    console.log(
      `[get-link] Schedule link for ${displayName} <${email}>: ${scheduleUrl}`
    );
  }

  // Always return 200 — don't reveal whether the email is registered
  return NextResponse.json({ ok: true });
}
