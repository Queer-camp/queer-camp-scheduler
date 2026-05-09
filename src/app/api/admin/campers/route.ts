import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campId = req.nextUrl.searchParams.get("camp_id");
  const supabase = createAdminClient();

  let query = supabase
    .from("campers")
    .select(`
      id, chosen_first_name, chosen_last_name, pronouns, email, track_id, created_at,
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
