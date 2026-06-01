import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminRole } from "@/lib/admin-auth";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminRole(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("staff_notes")
    .select("id, body, created_by_name, created_at")
    .eq("admin_user_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let session;
  try { session = await verifySessionToken(token); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSession = await requireAdminRole(req);
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Note body is required." }, { status: 400 });

  const supabase = createAdminClient();

  // Get the current admin's name for attribution
  const { data: me } = await supabase
    .from("admin_users")
    .select("name")
    .eq("id", adminSession.adminId)
    .single();

  const { data, error } = await supabase
    .from("staff_notes")
    .insert({
      admin_user_id: id,
      body: body.trim(),
      created_by_name: me?.name ?? session.email,
    })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to save note." }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
