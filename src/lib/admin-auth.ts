import { NextRequest } from "next/server";
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
