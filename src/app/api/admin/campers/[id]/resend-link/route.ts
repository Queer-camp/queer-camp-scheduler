import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { sendScheduleLink } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: camper, error } = await supabase
    .from("campers")
    .select("chosen_first_name, chosen_last_name, email, token")
    .eq("id", id)
    .single();

  if (error || !camper) return NextResponse.json({ error: "Camper not found" }, { status: 404 });

  const scheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/schedule?token=${camper.token}`;
  await sendScheduleLink({
    to: camper.email,
    displayName: `${camper.chosen_first_name} ${camper.chosen_last_name}`,
    scheduleUrl,
  });

  return NextResponse.json({ ok: true });
}
