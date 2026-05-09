import { createAdminClient } from "@/lib/supabase";

export async function getActiveCampId(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("camps")
    .select("id")
    .eq("is_active", true)
    .single();
  return data?.id ?? null;
}
