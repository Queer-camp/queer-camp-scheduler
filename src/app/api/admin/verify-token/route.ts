import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createSessionToken, COOKIE_NAME } from "@/lib/admin-session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", req.url));
  }

  const supabase = createAdminClient();

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, role, login_token_expires_at")
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

  const response = NextResponse.redirect(new URL("/admin", req.url));
  response.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
