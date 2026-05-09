import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendAdminLoginLink } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (admin) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from("admin_users")
      .update({ login_token: token, login_token_expires_at: expires })
      .eq("id", admin.id);

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/verify-token?token=${token}`;

    try {
      await sendAdminLoginLink({ to: email.trim().toLowerCase(), loginUrl });
    } catch (err) {
      console.error("Failed to send admin login email:", err);
    }
  }

  // Always return 200 — don't reveal whether the email is an admin
  return NextResponse.json({ ok: true });
}
