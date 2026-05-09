import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_APP_URL!)
  );
  response.cookies.delete(COOKIE_NAME);
  return response;
}
