import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session";
import { sendAdminInvite } from "@/lib/email";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let session;
  try { session = await verifySessionToken(token); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, role } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const resolvedRole = role === "leader" ? "leader" : "admin";
  const trimmedEmail = email?.trim().toLowerCase() || null;

  const supabase = createAdminClient();

  // Check if already an admin (only if email provided)
  if (trimmedEmail) {
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", trimmedEmail)
      .single();

    if (existing) {
      return NextResponse.json({ error: "An admin with that email already exists." }, { status: 409 });
    }
  }

  const insertData: Record<string, unknown> = {
    name: name.trim(),
    role: resolvedRole,
  };

  if (trimmedEmail) {
    // Create invite token (48h expiry)
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    insertData.email = trimmedEmail;
    insertData.login_token = inviteToken;
    insertData.login_token_expires_at = expires;
  }

  const { data: newAdmin, error: insertErr } = await supabase
    .from("admin_users")
    .insert(insertData)
    .select()
    .single();

  if (insertErr || !newAdmin) {
    return NextResponse.json({ error: insertErr?.message ?? "Failed to create admin." }, { status: 500 });
  }

  if (trimmedEmail) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/verify-token?token=${insertData.login_token}`;
    try {
      await sendAdminInvite({
        to: trimmedEmail,
        name: name.trim(),
        inviteUrl,
        invitedBy: session.email,
        role: resolvedRole,
      });
    } catch (err) {
      console.error("Failed to send invite email:", err);
    }
  }

  return NextResponse.json(newAdmin, { status: 201 });
}
