import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin, requireAdminRole } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campId = req.nextUrl.searchParams.get("camp_id");
  if (!campId) return NextResponse.json({ error: "camp_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("resources").select("*").eq("camp_id", campId).order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await requireAdminRole(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { camp_id, title, url, target } = body;
  if (!camp_id || !title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "camp_id, title, and url are required." }, { status: 400 });
  }
  if (!["same_tab", "new_tab"].includes(target)) {
    return NextResponse.json({ error: "target must be same_tab or new_tab." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("resources").select("position").eq("camp_id", camp_id).order("position");
  const used = new Set((existing ?? []).map((r: { position: number }) => r.position));
  if (used.size >= 4) return NextResponse.json({ error: "Maximum 4 resources per camp." }, { status: 400 });
  const position = [1, 2, 3, 4].find((p) => !used.has(p))!;
  const { data, error } = await supabase.from("resources").insert({ camp_id, title: title.trim(), url: url.trim(), target, position }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
