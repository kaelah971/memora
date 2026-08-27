import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { getCurrentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listCreatorActions(
  creatorId: string,
): Promise<DataResult<Tables<"creator_actions">[]>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: [], access: access.status, error: access.status.reason ?? "The creator profile does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("creator_actions")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function recordCreatorAction(
  action: TablesInsert<"creator_actions">,
): Promise<DataResult<Tables<"creator_actions"> | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== action.creator_id) {
    return { data: null, access: access.status, error: access.status.reason ?? "The creator action does not belong to the active workspace." };
  }

  const { data, error } = await access.client.from("creator_actions").insert({ ...action, workspace_id: workspaceId }).select("*").single();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function updateCreatorAction(
  actionId: string,
  update: TablesUpdate<"creator_actions">,
  creatorId: string,
): Promise<DataResult<Tables<"creator_actions"> | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: null, access: access.status, error: access.status.reason ?? "The creator action does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("creator_actions")
    .update(update)
    .eq("id", actionId)
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();
  return { data, access: access.status, error: error?.message ?? null };
}
