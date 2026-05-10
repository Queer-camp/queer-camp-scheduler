import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session";

export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

// For write operations — rejects staff (read-only) sessions
export async function requireAdminRole(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return null;
  if (session.role !== "admin") return null;
  return session;
}

// For server components — reads cookies via next/headers
export async function requireAdminFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
