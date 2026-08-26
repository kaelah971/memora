import "server-only";

import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function upsertMindReasoning(
  reasoning: TablesInsert<"follow_up_mind_reasoning">,
): Promise<DataResult<Tables<"follow_up_mind_reasoning"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("follow_up_mind_reasoning")
    .upsert(reasoning, { onConflict: "creator_id,opportunity_id" })
    .select("*")
    .single();

  return { data, access: access.status, error: error?.message ?? null };
}
