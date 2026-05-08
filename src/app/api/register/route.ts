import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CAMP_ID } from "@/lib/constants";

const REQUIRED_FIELDS = [
  "chosen_first_name",
  "chosen_last_name",
  "legal_first_name",
  "legal_last_name",
  "email",
] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]?.trim()) {
      return NextResponse.json(
        { error: `${field.replace(/_/g, " ")} is required.` },
        { status: 400 }
      );
    }
  }

  const supabase = createAdminClient();

  const { data: camper, error: camperError } = await supabase
    .from("campers")
    .insert({
      camp_id: CAMP_ID,
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
            "One or more workshops filled up just now. Please go back and re-select.",
        },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({ camper_id: camper.id, token: camper.token });
}
