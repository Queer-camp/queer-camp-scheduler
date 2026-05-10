import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminRole } from "@/lib/admin-auth";
import { resolveRecipients, type BroadcastFilter } from "@/lib/broadcast";
import { sendBroadcast } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!await requireAdminRole(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  const filter = body.filter as BroadcastFilter | undefined;

  if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  if (!messageBody) return NextResponse.json({ error: "Body is required." }, { status: 400 });
  if (!filter || !["camp", "track", "activity", "team"].includes(filter.type)) {
    return NextResponse.json({ error: "Valid filter is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { campName, recipients } = await resolveRecipients(supabase, filter);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients match this filter." }, { status: 400 });
  }

  let sent = 0;
  const failures: { email: string; error: string }[] = [];

  for (const r of recipients) {
    try {
      await sendBroadcast({
        to: r.email,
        displayName: r.name,
        campName,
        subject,
        body: messageBody,
      });
      sent++;
    } catch (err) {
      failures.push({ email: r.email, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return NextResponse.json({ sent, failed: failures.length, failures });
}
