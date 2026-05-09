import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session";

export async function middleware(req: NextRequest) {
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
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login", req.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
