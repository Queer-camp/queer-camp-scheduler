import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// Tells the login page whether to show the PIN field or fall back to the
// email link. Deliberately returns only a boolean — never role, name, or
// whether the account exists — to limit what an unauthenticated caller can
// learn about who has admin access.
export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ hasPin: false });
  }

  const supabase = createAdminClient();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("pin_hash, pin_locked_until")
    .eq("email", email.trim().toLowerCase())
    .single();

  const locked =
    !!admin?.pin_locked_until && new Date(admin.pin_locked_until) > new Date();

  return NextResponse.json({ hasPin: !!admin?.pin_hash && !locked });
}
