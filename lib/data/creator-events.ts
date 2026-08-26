import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listCreatorEvents(
  creatorId: string,
): Promise<DataResult<Tables<"creator_events">[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("creator_events")
    .select("*")
    .eq("creator_id", creatorId)
    .order("occurred_at", { ascending: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function createCreatorEvent(
  event: TablesInsert<"creator_events">,
): Promise<DataResult<Tables<"creator_events"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  if (event.external_id) {
    const existing = await access.client
      .from("creator_events")
      .select("*")
      .eq("creator_id", event.creator_id)
      .eq("event_type", event.event_type)
      .eq("external_id", event.external_id)
      .maybeSingle();
    if (existing.error) return { data: null, access: access.status, error: existing.error.message };
    if (existing.data) return { data: existing.data, access: access.status, error: null };
  }

  const { data, error } = await access.client.from("creator_events").insert(event).select("*").single();
  return { data, access: access.status, error: error?.message ?? null };
}
