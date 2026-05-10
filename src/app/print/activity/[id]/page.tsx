import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { requireAdminFromCookies } from "@/lib/admin-auth";
import { RosterPrint } from "@/components/admin/RosterPrint";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity roster" };

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function parseDays(day: string): string[] {
  const set = new Set(day.split(",").map(d => d.trim()).filter(Boolean));
  return ALL_DAYS.filter(d => set.has(d));
}

export default async function PrintActivityRoster({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminFromCookies();
  if (!session) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("*, camp:camps(name)")
    .eq("id", id)
    .single();

  if (!activity) notFound();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("camper:campers(chosen_first_name, chosen_last_name, pronouns)")
    .eq("activity_id", id);

  type CamperRow = { chosen_first_name: string; chosen_last_name: string; pronouns: string | null };
  const campers: CamperRow[] = (registrations ?? []).flatMap((r) => {
    const c = r.camper as unknown as CamperRow | CamperRow[] | null;
    if (!c) return [];
    return Array.isArray(c) ? c : [c];
  });

  const camp = (activity as { camp: { name: string } | null }).camp;

  return (
    <RosterPrint
      campName={camp?.name ?? "Camp"}
      kindLabel="Activity"
      itemName={activity.name}
      emoji={activity.emoji}
      startTime={activity.start_time}
      endTime={activity.end_time}
      location={activity.location}
      days={parseDays(activity.day)}
      campers={campers}
    />
  );
}
