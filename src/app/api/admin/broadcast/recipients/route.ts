import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminRole } from "@/lib/admin-auth";
import { resolveRecipients, type BroadcastFilter } from "@/lib/broadcast";

export async function POST(req: NextRequest) {
  if (!await requireAdminRole(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const filter = body.filter as BroadcastFilter | undefined;
  if (!filter || !["camp", "track", "activity", "team"].includes(filter.type)) {
    return NextResponse.json({ error: "Valid filter is required." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const result = await resolveRecipients(supabase, filter);
  return NextResponse.json(result);
}
