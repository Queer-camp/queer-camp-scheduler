import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createSessionToken, sessionCookieOptions, COOKIE_NAME } from "@/lib/admin-session";
import { verifyPin, isValidPinFormat, MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MINUTES } from "@/lib/pin";

const INVALID = () =>
  NextResponse.json({ error: "Invalid email or PIN." }, { status: 401 });

const LOCKED = () =>
  NextResponse.json(
    { error: "Too many attempts. Use the email login link instead." },
    { status: 423 }
  );

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json();

  if (!email?.trim() || !isValidPinFormat(pin)) {
    return NextResponse.json({ error: "Invalid email or PIN." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, role, pin_hash, pin_failed_attempts, pin_locked_until")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (!admin || !admin.pin_hash) {
    return INVALID();
  }

  if (admin.pin_locked_until && new Date(admin.pin_locked_until) > new Date()) {
    return LOCKED();
  }

  const valid = verifyPin(pin, admin.pin_hash);

  if (!valid) {
    const attempts = (admin.pin_failed_attempts ?? 0) + 1;
    const lockedOut = attempts >= MAX_PIN_ATTEMPTS;
    await supabase
      .from("admin_users")
      .update({
        pin_failed_attempts: attempts,
        pin_locked_until: lockedOut
          ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null,
      })
      .eq("id", admin.id);

    return lockedOut ? LOCKED() : INVALID();
  }

  await supabase
    .from("admin_users")
    .update({ pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", admin.id);

  const jwt = await createSessionToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, jwt, sessionCookieOptions());
  return response;
}
