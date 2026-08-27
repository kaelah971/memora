import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { getCurrentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listCreatorEvents(
  creatorId: string,
): Promise<DataResult<Tables<"creator_events">[]>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: [], access: access.status, error: access.status.reason ?? "The creator profile does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("creator_events")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function createCreatorEvent(
  event: TablesInsert<"creator_events">,
): Promise<DataResult<Tables<"creator_events"> | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== event.creator_id) {
    return { data: null, access: access.status, error: access.status.reason ?? "The creator event does not belong to the active workspace." };
  }

  if (event.external_id) {
    const existing = await access.client
      .from("creator_events")
      .select("*")
      .eq("creator_id", event.creator_id)
      .eq("workspace_id", workspaceId)
      .eq("event_type", event.event_type)
      .eq("external_id", event.external_id)
      .maybeSingle();
    if (existing.error) return { data: null, access: access.status, error: existing.error.message };
    if (existing.data) return { data: existing.data, access: access.status, error: null };
  }

  const { data, error } = await access.client.from("creator_events").insert({ ...event, workspace_id: workspaceId }).select("*").single();
  return { data, access: access.status, error: error?.message ?? null };
}
