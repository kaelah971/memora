import "server-only";

import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { getCurrentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function upsertMindReasoning(
  reasoning: TablesInsert<"follow_up_mind_reasoning">,
): Promise<DataResult<Tables<"follow_up_mind_reasoning"> | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== reasoning.creator_id) {
    return { data: null, access: access.status, error: access.status.reason ?? "The Mind reasoning does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("follow_up_mind_reasoning")
    .upsert({ ...reasoning, workspace_id: workspaceId }, { onConflict: "creator_id,opportunity_id" })
    .select("*")
    .single();

  return { data, access: access.status, error: error?.message ?? null };
}
