import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listCreatorActions(
  creatorId: string,
): Promise<DataResult<Tables<"creator_actions">[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("creator_actions")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function recordCreatorAction(
  action: TablesInsert<"creator_actions">,
): Promise<DataResult<Tables<"creator_actions"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const { data, error } = await access.client.from("creator_actions").insert(action).select("*").single();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function updateCreatorAction(
  actionId: string,
  update: TablesUpdate<"creator_actions">,
): Promise<DataResult<Tables<"creator_actions"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("creator_actions")
    .update(update)
    .eq("id", actionId)
    .select("*")
    .single();
  return { data, access: access.status, error: error?.message ?? null };
}
