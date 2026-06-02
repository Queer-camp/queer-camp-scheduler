import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: person } = await supabase
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .eq("id", id)
    .single();

  if (!person) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Find all events where organizer matches this person's name
  const name = person.name;
  let tracks: unknown[] = [];
  let activities: unknown[] = [];
  let standingEvents: unknown[] = [];

  if (name) {
    const [t, a, s] = await Promise.all([
      supabase.from("tracks").select("id, name, emoji, camp_id, camps(id, name, is_active)").contains("organizers", [name]),
      supabase.from("activities").select("id, name, emoji, day, camp_id, camps(id, name, is_active)").contains("organizers", [name]),
      supabase.from("standing_events").select("id, name, emoji, day, camp_id, camps(id, name, is_active)").contains("organizers", [name]),
    ]);
    tracks = t.data ?? [];
    activities = a.data ?? [];
    standingEvents = s.data ?? [];
  }

  return NextResponse.json({ person, tracks, activities, standingEvents });
}
