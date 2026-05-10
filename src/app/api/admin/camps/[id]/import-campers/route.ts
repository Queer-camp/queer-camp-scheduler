import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminRole } from "@/lib/admin-auth";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdminRole(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetCampId } = await params;
  const body = await req.json();
  const sourceCampId = typeof body.source_camp_id === "string" ? body.source_camp_id : null;

  if (!sourceCampId) {
    return NextResponse.json({ error: "source_camp_id is required." }, { status: 400 });
  }
  if (sourceCampId === targetCampId) {
    return NextResponse.json({ error: "Source and target camp must differ." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [{ data: sourceCampers }, { data: existing }] = await Promise.all([
    supabase
      .from("campers")
      .select("chosen_first_name, chosen_last_name, legal_first_name, legal_last_name, pronouns, email")
      .eq("camp_id", sourceCampId),
    supabase.from("campers").select("email").eq("camp_id", targetCampId),
  ]);

  const existingEmails = new Set((existing ?? []).map((c) => c.email.toLowerCase()));

  const toInsert: Array<{
    camp_id: string;
    chosen_first_name: string;
    chosen_last_name: string;
    legal_first_name: string;
    legal_last_name: string;
    pronouns: string | null;
    email: string;
    token: string;
  }> = [];
  let skipped = 0;

  for (const c of sourceCampers ?? []) {
    if (existingEmails.has(c.email.toLowerCase())) {
      skipped++;
      continue;
    }
    toInsert.push({
      camp_id: targetCampId,
      chosen_first_name: c.chosen_first_name,
      chosen_last_name: c.chosen_last_name,
      legal_first_name: c.legal_first_name,
      legal_last_name: c.legal_last_name,
      pronouns: c.pronouns,
      email: c.email,
      token: crypto.randomBytes(16).toString("hex"),
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped });
  }

  const { error } = await supabase.from("campers").insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imported: toInsert.length, skipped });
}
