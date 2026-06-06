import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminRole } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const allowed = ["title", "url", "target"];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if ("target" in updates && !["same_tab", "new_tab"].includes(updates.target as string)) {
    return NextResponse.json({ error: "target must be same_tab or new_tab." }, { status: 400 });
  }
  if ("title" in updates) updates.title = (updates.title as string).trim();
  if ("url" in updates) updates.url = (updates.url as string).trim();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("resources").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
