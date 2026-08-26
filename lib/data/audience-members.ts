import type { Tables } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export interface AudienceHistory {
  member: Tables<"audience_members">;
  interactions: Tables<"interactions">[];
  sources: Record<string, Tables<"sources">>;
  openQuestionCount: number;
}

export async function listAudienceMembers(
  creatorId: string,
): Promise<DataResult<AudienceHistory[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const [membersResult, interactionsResult, questionsResult, sourcesResult] = await Promise.all([
    access.client
      .from("audience_members")
      .select("*")
      .eq("creator_id", creatorId)
      .order("last_seen_at", { ascending: false }),
    access.client
      .from("interactions")
      .select("*")
      .eq("creator_id", creatorId)
      .order("published_at", { ascending: true }),
    access.client
      .from("unresolved_questions")
      .select("audience_member_id, status")
      .eq("creator_id", creatorId)
      .eq("status", "open"),
    access.client
      .from("sources")
      .select("*")
      .eq("creator_id", creatorId),
  ]);

  const queryError = [membersResult, interactionsResult, questionsResult, sourcesResult].find(
    (result) => result.error,
  )?.error;
  if (queryError) return { data: [], access: access.status, error: queryError.message };

  const interactionsByMember = new Map<string, Tables<"interactions">[]>();
  for (const interaction of interactionsResult.data ?? []) {
    const memberInteractions = interactionsByMember.get(interaction.audience_member_id) ?? [];
    memberInteractions.push(interaction);
    interactionsByMember.set(interaction.audience_member_id, memberInteractions);
  }

  const openQuestionsByMember = new Map<string, number>();
  for (const question of questionsResult.data ?? []) {
    openQuestionsByMember.set(
      question.audience_member_id,
      (openQuestionsByMember.get(question.audience_member_id) ?? 0) + 1,
    );
  }

  const sourcesById = Object.fromEntries((sourcesResult.data ?? []).map((source) => [source.id, source]));

  return {
    data: (membersResult.data ?? []).map((member) => ({
      member,
      interactions: interactionsByMember.get(member.id) ?? [],
      sources: sourcesById,
      openQuestionCount: openQuestionsByMember.get(member.id) ?? 0,
    })),
    access: access.status,
    error: null,
  };
}
