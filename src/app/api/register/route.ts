import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CAMP_ID } from "@/lib/constants";

const REQUIRED_FIELDS = [
  "legal_first_name",
  "legal_last_name",
  "email",
  "guardian_first_name",
  "guardian_last_name",
  "guardian_email",
  "guardian_phone",
  "guardian_relationship",
] as const;

const REQUIRED_EMERGENCY_FIELDS = [
  "emergency_first_name",
  "emergency_last_name",
  "emergency_phone",
  "emergency_relationship",
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

  if (!body.emergency_same_as_guardian) {
    for (const field of REQUIRED_EMERGENCY_FIELDS) {
      if (!body[field]?.trim()) {
        return NextResponse.json(
          { error: `${field.replace(/_/g, " ")} is required.` },
          { status: 400 }
        );
      }
    }
  }

  const supabase = createAdminClient();

  // Insert camper
  const { data: camper, error: camperError } = await supabase
    .from("campers")
    .insert({
      camp_id: CAMP_ID,
      legal_first_name: body.legal_first_name.trim(),
      legal_last_name: body.legal_last_name.trim(),
      chosen_name: body.chosen_name?.trim() || null,
      pronouns: body.pronouns?.trim() || null,
      email: body.email.trim().toLowerCase(),
      guardian_first_name: body.guardian_first_name.trim(),
      guardian_last_name: body.guardian_last_name.trim(),
      guardian_email: body.guardian_email.trim().toLowerCase(),
      guardian_phone: body.guardian_phone.trim(),
      guardian_relationship: body.guardian_relationship.trim(),
      emergency_same_as_guardian: !!body.emergency_same_as_guardian,
      emergency_first_name: body.emergency_same_as_guardian
        ? null
        : body.emergency_first_name?.trim() || null,
      emergency_last_name: body.emergency_same_as_guardian
        ? null
        : body.emergency_last_name?.trim() || null,
      emergency_phone: body.emergency_same_as_guardian
        ? null
        : body.emergency_phone?.trim() || null,
      emergency_relationship: body.emergency_same_as_guardian
        ? null
        : body.emergency_relationship?.trim() || null,
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

  // Insert activity registrations
  const activityIds: string[] = Array.isArray(body.activity_ids)
    ? body.activity_ids.filter((id: unknown) => typeof id === "string")
    : [];

  if (activityIds.length > 0) {
    const { error: regError } = await supabase.from("registrations").insert(
      activityIds.map((activityId) => ({
        camper_id: camper.id,
        activity_id: activityId,
      }))
    );

    if (regError) {
      console.error("Registration insert error:", regError);
      // Compensate: remove the camper so the user can try again cleanly
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
