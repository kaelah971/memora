import "server-only";

import { getCurrentDataAccess } from "@/lib/data/access";
import { normalizeCreatorVoice } from "@/types/data";
import type { DataResult } from "@/lib/data/types";
import {
  buildFollowUpOpportunities,
  getFollowUpDataOrigin,
  isImportedEvent,
  isImportedInteraction,
  type FollowUpDataOrigin,
  type FollowUpQueue,
} from "@/lib/data/follow-up-builder";

export type {
  FollowUpDataOrigin,
  FollowUpMindReasoning,
  FollowUpOpportunity,
  FollowUpProof,
  FollowUpQueue,
  FollowUpStatus,
  MindReasoningVariants,
  MindsContinuityReference,
  PostedReplyProof,
} from "@/lib/data/follow-up-builder";

export async function listFollowUpOpportunities(
  creatorId: string,
): Promise<DataResult<FollowUpQueue>> {
  const access = await getCurrentDataAccess();
  const emptyQueue: FollowUpQueue = {
    opportunities: [],
    dataOrigin: "none",
    importedInteractionCount: 0,
    importedEventCount: 0,
  };
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: emptyQueue, access: access.status, error: access.status.reason ?? "The creator profile does not belong to the active workspace." };
  }

  const [creatorResult, membersResult, interactionsResult, sourcesResult, questionsResult, eventsResult, actionsResult, mindReasoningResult] = await Promise.all([
    access.client.from("creators").select("voice_preference").eq("id", creatorId).eq("workspace_id", workspaceId).maybeSingle(),
    access.client.from("audience_members").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId),
    access.client.from("interactions").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).order("published_at", { ascending: false }),
    access.client.from("sources").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId),
    access.client.from("unresolved_questions").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId),
    access.client.from("creator_events").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }),
    access.client.from("creator_actions").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    access.client.from("follow_up_mind_reasoning").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
  ]);
  const queryError = [creatorResult, membersResult, interactionsResult, sourcesResult, questionsResult, eventsResult, actionsResult, mindReasoningResult].find(
    (result) => result.error,
  )?.error;
  if (queryError) return { data: emptyQueue, access: access.status, error: queryError.message };

  const members = membersResult.data ?? [];
  const interactions = interactionsResult.data ?? [];
  const sources = sourcesResult.data ?? [];
  const questions = questionsResult.data ?? [];
  const creatorEvents = eventsResult.data ?? [];
  const creatorActions = actionsResult.data ?? [];
  const mindReasoning = mindReasoningResult.data ?? [];
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const importedInteractionCount = interactions.filter((interaction) => {
    const source = sourcesById.get(interaction.source_id);
    return isImportedInteraction(interaction, source);
  }).length;
  const importedEventCount = creatorEvents.filter((event) => {
    const source = event.source_id ? sourcesById.get(event.source_id) : undefined;
    return isImportedEvent(event, source);
  }).length;
  const dataOrigin: FollowUpDataOrigin = getFollowUpDataOrigin(interactions, creatorEvents, sources);

  return {
    data: {
      opportunities: buildFollowUpOpportunities({
        members,
        interactions,
        sources,
        questions,
        creatorEvents,
        creatorActions,
        mindReasoning,
        creatorVoice: normalizeCreatorVoice(creatorResult.data?.voice_preference),
        dataOrigin: dataOrigin === "none" ? undefined : dataOrigin,
      }),
      dataOrigin,
      importedInteractionCount,
      importedEventCount,
    },
    access: access.status,
    error: null,
  };
}
