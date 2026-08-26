import "server-only";

import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";
import {
  buildJudgeProofData,
  emptyJudgeProofData,
  type JudgeProofData,
} from "@/lib/data/judge-proof-builder";

export type { JudgeAudienceInteraction, JudgeAudienceRecord, JudgeProofData } from "@/lib/data/judge-proof-builder";

export async function loadJudgeProof(): Promise<DataResult<JudgeProofData>> {
  const access = getDevelopmentDataAccess();
  const emptyData = emptyJudgeProofData();
  if (!access.client) return { data: emptyData, access: access.status, error: access.status.reason };

  const creatorResult = await access.client
    .from("creators")
    .select("*")
    .eq("slug", "memora-demo")
    .maybeSingle();
  if (creatorResult.error) return { data: emptyData, access: access.status, error: creatorResult.error.message };
  if (!creatorResult.data) return { data: emptyData, access: access.status, error: null };

  const creatorId = creatorResult.data.id;
  const [connectionResult, sourcesResult, membersResult, interactionsResult, questionsResult, eventsResult, actionsResult, discordConnectionResult, onboardingSettingsResult, onboardingReceiptsResult] = await Promise.all([
    access.client
      .from("youtube_connections")
      .select("youtube_channel_id, youtube_channel_title")
      .eq("creator_id", creatorId)
      .maybeSingle(),
    access.client.from("sources").select("*").eq("creator_id", creatorId),
    access.client.from("audience_members").select("*").eq("creator_id", creatorId),
    access.client.from("interactions").select("*").eq("creator_id", creatorId),
    access.client.from("unresolved_questions").select("*").eq("creator_id", creatorId),
    access.client.from("creator_events").select("*").eq("creator_id", creatorId),
    access.client.from("creator_actions").select("*").eq("creator_id", creatorId),
    access.client.from("discord_connections").select("guild_id, selected_channel_ids").eq("creator_id", creatorId).maybeSingle(),
    access.client.from("discord_onboarding_settings").select("enabled, send_mode").eq("creator_id", creatorId).maybeSingle(),
    access.client.from("discord_onboarding_receipts").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }),
  ]);
  const queryError = [connectionResult, sourcesResult, membersResult, interactionsResult, questionsResult, eventsResult, actionsResult, discordConnectionResult, onboardingSettingsResult, onboardingReceiptsResult].find(
    (result) => result.error,
  )?.error;
  if (queryError) return { data: emptyData, access: access.status, error: queryError.message };

  return {
    data: buildJudgeProofData({
      creator: creatorResult.data,
      youtubeConnection: connectionResult.data,
      sources: sourcesResult.data ?? [],
      members: membersResult.data ?? [],
      interactions: interactionsResult.data ?? [],
      questions: questionsResult.data ?? [],
      creatorEvents: eventsResult.data ?? [],
      creatorActions: actionsResult.data ?? [],
      discordConnection: discordConnectionResult.data,
      onboardingSettings: onboardingSettingsResult.data,
      onboardingReceipts: onboardingReceiptsResult.data ?? [],
    }),
    access: access.status,
    error: null,
  };
}
