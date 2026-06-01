import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";
import { sendAdminRemoved } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminRole(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { email, name, role } = await req.json();

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (name !== undefined) updates.name = name?.trim() || null;
  if (role !== undefined) updates.role = role === "leader" ? "leader" : "admin";

  if (email !== undefined) {
    const trimmedEmail = email?.trim().toLowerCase() || null;
    if (trimmedEmail) {
      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", trimmedEmail)
        .neq("id", id)
        .single();
      if (existing) {
        return NextResponse.json({ error: "That email is already used by another admin." }, { status: 409 });
      }
    }
    updates.email = trimmedEmail;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to update." }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminRole(req);
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

  if (target.email) {
    try {
      await sendAdminRemoved({
        to: target.email,
        name: target.name ?? target.email,
        removedBy: session.email,
      });
    } catch (err) {
      console.error("Failed to send removal email:", err);
    }
  }

  return new NextResponse(null, { status: 204 });
}
