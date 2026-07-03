import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { hashPin, isValidPinFormat } from "@/lib/pin";

// Any signed-in admin_users row (admin or leader) can set/change/remove their
// own PIN — this is read-only for leaders elsewhere, but a PIN only ever
// controls access to their own account.
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pin } = await req.json();
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .update({
      pin_hash: hashPin(pin),
      pin_failed_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", session.adminId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .update({ pin_hash: null, pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", session.adminId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
