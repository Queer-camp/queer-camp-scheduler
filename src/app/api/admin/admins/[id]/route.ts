import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { sendAdminRemoved } from "@/lib/email";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === session.adminId) {
    return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("admin_users")
    .select("name, email")
    .eq("id", id)
    .single();

  if (!target) return NextResponse.json({ error: "Admin not found." }, { status: 404 });

  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await sendAdminRemoved({
      to: target.email,
      name: target.name ?? target.email,
      removedBy: session.email,
    });
  } catch (err) {
    console.error("Failed to send removal email:", err);
  }

  return new NextResponse(null, { status: 204 });
}
