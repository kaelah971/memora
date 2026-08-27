import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { getCurrentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listSources(creatorId: string): Promise<DataResult<Tables<"sources">[]>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: [], access: access.status, error: access.status.reason ?? "The creator profile does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("sources")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false, nullsFirst: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function createSource(
  source: TablesInsert<"sources">,
): Promise<DataResult<Tables<"sources"> | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== source.creator_id) {
    return { data: null, access: access.status, error: access.status.reason ?? "The source does not belong to the active workspace." };
  }

  if (source.external_id) {
    const existing = await access.client
      .from("sources")
      .select("*")
      .eq("creator_id", source.creator_id)
      .eq("workspace_id", workspaceId)
      .eq("platform", source.platform)
      .eq("external_id", source.external_id)
      .maybeSingle();
    if (existing.error) return { data: null, access: access.status, error: existing.error.message };
    if (existing.data) return { data: existing.data, access: access.status, error: null };
  }

  const { data, error } = await access.client.from("sources").insert({ ...source, workspace_id: workspaceId }).select("*").single();
  return { data, access: access.status, error: error?.message ?? null };
}
