import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminFromCookies } from "@/lib/admin-auth";
import { RosterPrint } from "@/components/admin/RosterPrint";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track roster" };

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function daysInRange(startDate: string, endDate: string): string[] {
  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diffDays = (end.getTime() - start.getTime()) / 86400000;
  if (diffDays >= 6) return ALL_DAYS;
  const available = new Set<string>();
  const cur = new Date(start);
  while (cur <= end) { available.add(DOW[cur.getDay()]); cur.setDate(cur.getDate() + 1); }
  return ALL_DAYS.filter(d => available.has(d));
}

export default async function PrintTrackRoster({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminFromCookies();
  if (!session) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: track } = await supabase
    .from("tracks")
    .select("*, camp:camps(name, start_date, end_date)")
    .eq("id", id)
    .single();

  if (!track) notFound();

  const { data: campers } = await supabase
    .from("campers")
    .select("chosen_first_name, chosen_last_name, pronouns")
    .eq("track_id", id)
    .order("chosen_first_name");

  const camp = (track as { camp: { name: string; start_date: string; end_date: string } | null }).camp;
  const days = camp ? daysInRange(camp.start_date, camp.end_date) : [];

  return (
    <RosterPrint
      campName={camp?.name ?? "Camp"}
      kindLabel="Track"
      itemName={track.name}
      emoji={track.emoji}
      startTime={track.start_time}
      endTime={track.end_time}
      location={track.location}
      days={days}
      campers={campers ?? []}
    />
  );
}
