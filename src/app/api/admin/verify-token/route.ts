import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createSessionToken, sessionCookieOptions, COOKIE_NAME } from "@/lib/admin-session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", req.url));
  }

  const supabase = createAdminClient();

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, role, login_token_expires_at, pin_hash")
    .eq("login_token", token)
    .single();

  if (
    !admin ||
    !admin.login_token_expires_at ||
    new Date(admin.login_token_expires_at) < new Date()
  ) {
    return NextResponse.redirect(new URL("/admin/login?error=expired", req.url));
  }

  // Clear the one-time token
  await supabase
    .from("admin_users")
    .update({ login_token: null, login_token_expires_at: null })
    .eq("id", admin.id);

  const jwt = await createSessionToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });

  const destination = admin.pin_hash ? "/admin?welcome=1" : "/admin/set-pin?first=1";
  const response = NextResponse.redirect(new URL(destination, req.url));
  response.cookies.set(COOKIE_NAME, jwt, sessionCookieOptions());

  return response;
}
