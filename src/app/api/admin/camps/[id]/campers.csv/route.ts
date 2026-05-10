import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campId } = await params;
  const supabase = createAdminClient();

  const { data: camp } = await supabase.from("camps").select("id, name").eq("id", campId).single();
  if (!camp) return NextResponse.json({ error: "Camp not found" }, { status: 404 });

  const [{ data: campers }, { data: tracks }, { data: activities }, { data: registrations }] = await Promise.all([
    supabase
      .from("campers")
      .select("id, chosen_first_name, chosen_last_name, legal_first_name, legal_last_name, pronouns, email, track_id, created_at")
      .eq("camp_id", campId)
      .order("chosen_first_name"),
    supabase.from("tracks").select("id, name").eq("camp_id", campId),
    supabase.from("activities").select("id, name, day, start_time").eq("camp_id", campId),
    supabase.from("registrations").select("camper_id, activity_id"),
  ]);

  const trackById = new Map((tracks ?? []).map((t) => [t.id, t.name]));
  const activityById = new Map((activities ?? []).map((a) => [a.id, a]));

  const activityIdsByCamper = new Map<string, string[]>();
  for (const r of registrations ?? []) {
    if (!activityById.has(r.activity_id)) continue;
    const list = activityIdsByCamper.get(r.camper_id) ?? [];
    list.push(r.activity_id);
    activityIdsByCamper.set(r.camper_id, list);
  }

  const header = [
    "Chosen First Name",
    "Chosen Last Name",
    "Legal First Name",
    "Legal Last Name",
    "Pronouns",
    "Email",
    "Track",
    "Activities",
    "Registered At",
  ];

  const lines = [csvRow(header)];
  for (const c of campers ?? []) {
    const ids = activityIdsByCamper.get(c.id) ?? [];
    const activityNames = ids
      .map((aid) => activityById.get(aid))
      .filter((a): a is { id: string; name: string; day: string; start_time: string } => !!a)
      .sort((a, b) => (a.day === b.day ? a.start_time.localeCompare(b.start_time) : a.day.localeCompare(b.day)))
      .map((a) => a.name)
      .join("; ");
    lines.push(csvRow([
      c.chosen_first_name,
      c.chosen_last_name,
      c.legal_first_name,
      c.legal_last_name,
      c.pronouns ?? "",
      c.email,
      c.track_id ? (trackById.get(c.track_id) ?? "") : "",
      activityNames,
      c.created_at,
    ]));
  }

  const csv = lines.join("\n");
  const safeName = (camp.name || "camp").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "_") || "camp";
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}_campers.csv"`,
    },
  });
}
