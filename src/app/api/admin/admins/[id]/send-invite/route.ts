import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminRole } from "@/lib/admin-auth";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session";
import { sendAdminInvite } from "@/lib/email";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let session;
  try { session = await verifySessionToken(token); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSession = await requireAdminRole(req);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("admin_users")
    .select("id, name, email, role")
    .eq("id", id)
    .single();

  if (!target) return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  if (!target.email) return NextResponse.json({ error: "No email address on file." }, { status: 400 });

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("admin_users")
    .update({ login_token: inviteToken, login_token_expires_at: expires })
    .eq("id", id);

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/verify-token?token=${inviteToken}`;

  try {
    await sendAdminInvite({
      to: target.email,
      name: target.name ?? target.email,
      inviteUrl,
      invitedBy: session.email,
      role: target.role,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    return NextResponse.json({ error: "Failed to send invite email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
