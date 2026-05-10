import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendScheduleLink } from "@/lib/email";
import { getActiveCampId } from "@/lib/constants";

const REQUIRED_FIELDS = [
  "chosen_first_name",
  "chosen_last_name",
  "legal_first_name",
  "legal_last_name",
  "email",
] as const;

const MIN_FILL_MS = 4_000; // reject submissions faster than 4 seconds

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Honeypot check — bots fill in fields humans can't see
  if (body._hp) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  // Timing check — real humans take more than 4 seconds to fill out a form
  const elapsed = typeof body._t === "number" ? Date.now() - body._t : Infinity;
  if (elapsed < MIN_FILL_MS) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]?.trim()) {
      return NextResponse.json(
        { error: `${field.replace(/_/g, " ")} is required.` },
        { status: 400 }
      );
    }
  }

  const campId = await getActiveCampId();
  if (!campId) {
    return NextResponse.json(
      { error: "Registration is not currently available." },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();

  const { data: camper, error: camperError } = await supabase
    .from("campers")
    .insert({
      camp_id: campId,
      chosen_first_name: body.chosen_first_name.trim(),
      chosen_last_name: body.chosen_last_name.trim(),
      legal_first_name: body.legal_first_name.trim(),
      legal_last_name: body.legal_last_name.trim(),
      pronouns: body.pronouns?.trim() || null,
      email: body.email.trim().toLowerCase(),
      track_id: body.track_id ?? null,
    })
    .select("id, token")
    .single();

  if (camperError) {
    console.error("Camper insert error:", camperError);
    if (camperError.code === "23505") {
      return NextResponse.json(
        { error: "This email is already registered for this camp." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }

  const activityIds: string[] = Array.isArray(body.activity_ids)
    ? body.activity_ids.filter((id: unknown) => typeof id === "string")
    : [];

  if (activityIds.length > 0) {
    const { error: regError } = await supabase.from("registrations").insert(
      activityIds.map((activity_id) => ({
        camper_id: camper.id,
        activity_id,
      }))
    );

    if (regError) {
      console.error("Registration insert error:", regError);
      await supabase.from("campers").delete().eq("id", camper.id);
      return NextResponse.json(
        {
          error:
            "One or more activities filled up just now. Please go back and re-select.",
        },
        { status: 409 }
      );
    }
  }

  const scheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/schedule?token=${camper.token}`;
  const displayName = `${body.chosen_first_name.trim()} ${body.chosen_last_name.trim()}`;
  try {
    await sendScheduleLink({ to: body.email.trim().toLowerCase(), displayName, scheduleUrl });
  } catch (err) {
    console.error("Failed to send registration confirmation email:", err);
  }

  return NextResponse.json({ camper_id: camper.id, token: camper.token });
}
