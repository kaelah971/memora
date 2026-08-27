import type { Tables } from "@/lib/supabase/database.types";
import { getCurrentWorkspaceContext } from "@/lib/workspaces/access";
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
  const context = await getCurrentWorkspaceContext();
  return { data: context.data?.creator ?? null, access: context.access, error: context.error };
}

export async function updateCreatorVoicePreference(
  creatorId: string,
  voice: CreatorVoice,
): Promise<DataResult<CreatorVoice | null>> {
  const context = await getCurrentWorkspaceContext();
  if (!context.data) return { data: null, access: context.access, error: context.error };
  if (context.data.creator.id !== creatorId) {
    return { data: null, access: context.access, error: "The creator profile does not belong to the active workspace." };
  }

  const { data, error } = await context.data.client
    .from("creators")
    .update({ voice_preference: voice })
    .eq("id", creatorId)
    .eq("workspace_id", context.data.workspace.id)
    .select("voice_preference")
    .maybeSingle();

  return {
    data: data?.voice_preference ?? null,
    access: context.access,
    error: error?.message ?? null,
  };
}

export async function getCreatorWorkspaceSummary(): Promise<DataResult<WorkspaceSummary | null>> {
  const context = await getCurrentWorkspaceContext();
  if (context.error || !context.data) return { data: null, access: context.access, error: context.error };
  const { client, workspace, creator } = context.data;

  const [interactions, questions, audienceMembers, creatorEvents] = await Promise.all([
    client
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("workspace_id", workspace.id),
    client
      .from("unresolved_questions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("workspace_id", workspace.id)
      .eq("status", "open"),
    client
      .from("audience_members")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("workspace_id", workspace.id),
    client
      .from("creator_events")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("workspace_id", workspace.id),
  ]);

  const queryError = [interactions, questions, audienceMembers, creatorEvents].find(
    (result) => result.error,
  )?.error;

  if (queryError) {
    return { data: null, access: context.access, error: queryError.message };
  }

  return {
    data: {
      creator,
      counts: {
        interactions: interactions.count ?? 0,
        openQuestions: questions.count ?? 0,
        audienceMembers: audienceMembers.count ?? 0,
        creatorEvents: creatorEvents.count ?? 0,
      },
    },
    access: context.access,
    error: null,
  };
}
