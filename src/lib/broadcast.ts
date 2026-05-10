import type { SupabaseClient } from "@supabase/supabase-js";

export type BroadcastFilter =
  | { type: "camp" }
  | { type: "track"; id: string }
  | { type: "activity"; id: string }
  | { type: "team" };

export type Recipient = {
  id: string;
  name: string;
  email: string;
};

export type RecipientsResult = {
  campId: string | null;
  campName: string;
  recipients: Recipient[];
};

export async function resolveRecipients(
  supabase: SupabaseClient,
  filter: BroadcastFilter,
): Promise<RecipientsResult> {
  if (filter.type === "team") {
    const { data } = await supabase
      .from("admin_users")
      .select("id, name, email")
      .order("created_at");
    return {
      campId: null,
      campName: "Queer Camp Team",
      recipients: (data ?? []).map((a) => ({ id: a.id, name: a.name ?? a.email, email: a.email })),
    };
  }

  // For camp/track/activity filters we need the active camp
  const { data: camp } = await supabase
    .from("camps")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (!camp) {
    return { campId: null, campName: "Camp", recipients: [] };
  }

  if (filter.type === "camp") {
    const { data } = await supabase
      .from("campers")
      .select("id, chosen_first_name, chosen_last_name, email")
      .eq("camp_id", camp.id)
      .order("chosen_first_name");
    return {
      campId: camp.id,
      campName: camp.name,
      recipients: (data ?? []).map((c) => ({
        id: c.id,
        name: `${c.chosen_first_name} ${c.chosen_last_name}`,
        email: c.email,
      })),
    };
  }

  if (filter.type === "track") {
    const { data } = await supabase
      .from("campers")
      .select("id, chosen_first_name, chosen_last_name, email")
      .eq("camp_id", camp.id)
      .eq("track_id", filter.id)
      .order("chosen_first_name");
    return {
      campId: camp.id,
      campName: camp.name,
      recipients: (data ?? []).map((c) => ({
        id: c.id,
        name: `${c.chosen_first_name} ${c.chosen_last_name}`,
        email: c.email,
      })),
    };
  }

  // activity filter
  const { data: regs } = await supabase
    .from("registrations")
    .select("camper:campers(id, chosen_first_name, chosen_last_name, email, camp_id)")
    .eq("activity_id", filter.id);

  type CamperRow = { id: string; chosen_first_name: string; chosen_last_name: string; email: string; camp_id: string };
  const recipients: Recipient[] = (regs ?? []).flatMap((r) => {
    const c = r.camper as unknown as CamperRow | CamperRow[] | null;
    if (!c) return [];
    const list = Array.isArray(c) ? c : [c];
    return list
      .filter((x) => x.camp_id === camp.id)
      .map((x) => ({ id: x.id, name: `${x.chosen_first_name} ${x.chosen_last_name}`, email: x.email }));
  });
  recipients.sort((a, b) => a.name.localeCompare(b.name));

  return { campId: camp.id, campName: camp.name, recipients };
}
