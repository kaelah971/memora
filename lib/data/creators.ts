import type { Tables } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";
import type { CreatorVoice } from "@/types/data";

export interface WorkspaceCounts {
  interactions: number;
  openQuestions: number;
  audienceMembers: number;
  creatorEvents: number;
}

export interface WorkspaceSummary {
  creator: Tables<"creators">;
  counts: WorkspaceCounts;
}

export async function getCreatorWorkspace(): Promise<DataResult<Tables<"creators"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("creators")
    .select("*")
    .eq("slug", "memora-demo")
    .maybeSingle();

  return {
    data,
    access: access.status,
    error: error?.message ?? null,
  };
}

export async function updateCreatorVoicePreference(
  creatorId: string,
  voice: CreatorVoice,
): Promise<DataResult<CreatorVoice | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("creators")
    .update({ voice_preference: voice })
    .eq("id", creatorId)
    .select("voice_preference")
    .maybeSingle();

  return {
    data: data?.voice_preference ?? null,
    access: access.status,
    error: error?.message ?? null,
  };
}

export async function getCreatorWorkspaceSummary(): Promise<DataResult<WorkspaceSummary | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  const creatorResult = await access.client
    .from("creators")
    .select("*")
    .eq("slug", "memora-demo")
    .maybeSingle();

  if (creatorResult.error) {
    return { data: null, access: access.status, error: creatorResult.error.message };
  }

  if (!creatorResult.data) {
    return { data: null, access: access.status, error: null };
  }

  const [interactions, questions, audienceMembers, creatorEvents] = await Promise.all([
    access.client
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorResult.data.id),
    access.client
      .from("unresolved_questions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorResult.data.id)
      .eq("status", "open"),
    access.client
      .from("audience_members")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorResult.data.id),
    access.client
      .from("creator_events")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorResult.data.id),
  ]);

  const queryError = [interactions, questions, audienceMembers, creatorEvents].find(
    (result) => result.error,
  )?.error;

  if (queryError) {
    return { data: null, access: access.status, error: queryError.message };
  }

  return {
    data: {
      creator: creatorResult.data,
      counts: {
        interactions: interactions.count ?? 0,
        openQuestions: questions.count ?? 0,
        audienceMembers: audienceMembers.count ?? 0,
        creatorEvents: creatorEvents.count ?? 0,
      },
    },
    access: access.status,
    error: null,
  };
}
