import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  createSessionToken,
  sessionCookieOptions,
  COOKIE_NAME,
} from "@/lib/admin-session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the login page and auth callback through
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  try {
    const session = await verifySessionToken(token);
    // Rolling session: re-issue the cookie with a fresh 30-day expiry on every
    // visit, so anyone who opens the app at least once a month stays logged in.
    const response = NextResponse.next();
    const refreshed = await createSessionToken({
      adminId: session.adminId,
      email: session.email,
      role: session.role,
    });
    response.cookies.set(COOKIE_NAME, refreshed, sessionCookieOptions());
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login", req.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
