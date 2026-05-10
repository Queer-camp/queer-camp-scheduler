import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campId = req.nextUrl.searchParams.get("camp_id");
  if (!campId) return NextResponse.json({ error: "camp_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("activity_series").select("*").eq("camp_id", campId).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { camp_id, name, description } = body;
  if (!camp_id || !name?.trim()) {
    return NextResponse.json({ error: "camp_id and name are required." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("activity_series").insert({
    camp_id, name: name.trim(), description: description?.trim() || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
