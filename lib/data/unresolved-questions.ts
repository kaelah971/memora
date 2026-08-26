import type { Tables } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listOpenQuestions(
  creatorId: string,
): Promise<DataResult<Tables<"unresolved_questions">[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("unresolved_questions")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function markQuestionAnswered(
  creatorId: string,
  questionId: string,
  resolutionType: string,
  resolvedByInteractionId?: string,
): Promise<DataResult<Tables<"unresolved_questions"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("unresolved_questions")
    .update({
      status: "answered",
      resolution_type: resolutionType,
      resolved_by_interaction_id: resolvedByInteractionId ?? null,
      resolved_at: new Date().toISOString(),
      dismissed_at: null,
    })
    .eq("creator_id", creatorId)
    .eq("id", questionId)
    .select("*")
    .maybeSingle();

  return { data, access: access.status, error: error?.message ?? null };
}
