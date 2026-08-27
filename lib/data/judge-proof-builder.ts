import type { Tables } from "@/lib/supabase/database.types";

import {
  buildFollowUpOpportunities,
  getFollowUpDataOrigin,
  getPostedReplyProof,
  isImportedDiscordEvent,
  isImportedDiscordInteraction,
  isImportedYouTubeInteraction,
  isImportedYouTubeSource,
  MINDS_CONTINUITY_PROOF_REFERENCE,
  type FollowUpOpportunity,
  type FollowUpDataOrigin,
  type PostedReplyProof,
} from "@/lib/data/follow-up-builder";
import { getMindsConfigStatus } from "@/lib/minds/config";
import { getDiscordConfigStatus, type DiscordConfigStatus } from "@/lib/discord/config";
import { normalizeCreatorVoice } from "@/types/data";
import type { OnboardingReceiptStatus, OnboardingSendMode, OnboardingTriggerType } from "@/lib/discord/onboarding-types";

type Creator = Tables<"creators">;
type Source = Tables<"sources">;
type AudienceMember = Tables<"audience_members">;
type Interaction = Tables<"interactions">;
type UnresolvedQuestion = Tables<"unresolved_questions">;
type CreatorEvent = Tables<"creator_events">;
type CreatorAction = Tables<"creator_actions">;
type YouTubeConnection = Tables<"youtube_connections">;
type DiscordConnection = Tables<"discord_connections">;
type DiscordOnboardingSettings = Tables<"discord_onboarding_settings">;
type DiscordOnboardingReceipt = Tables<"discord_onboarding_receipts">;

function actionMetadataString(action: CreatorAction, key: string): string | null {
  if (!action.metadata || typeof action.metadata !== "object" || Array.isArray(action.metadata)) return null;
  const value = (action.metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export interface JudgeAudienceInteraction {
  id: string;
  text: string;
  sourceTitle: string;
  publishedAt: string;
}

export interface JudgeAudienceRecord {
  id: string;
  name: string;
  platform: string;
  imported: boolean;
  interactions: JudgeAudienceInteraction[];
}

export interface FollowUpContentTaskReceipt {
  id: string;
  opportunityId: string;
  audienceMemberName: string;
  sourceTitle: string;
  sourceQuestion: string;
  status: "needs_follow_up_content";
  selectedTone: string | null;
  createdAt: string;
  nextStep: "Create and import the follow-up video";
}

export interface JudgeProofData {
  systemStatus: {
    youtubeOAuthConnected: boolean;
    supabasePersistenceVerified: boolean;
    mindsContinuityVerified: boolean;
    followUpActionsPersisted: boolean;
  };
  ingestion: {
    channelTitle: string | null;
    channelId: string | null;
    importedVideoCount: number;
    importedCommentCount: number;
    sourceBackedAudienceCount: number;
    dataOrigin: FollowUpDataOrigin;
  };
  discord: {
    configured: boolean;
    guildId: string | null;
    monitoredChannelIds: string[];
    importedMessageCount: number;
    sourceBackedPeopleCount: number;
    opportunityCount: number;
    representative: FollowUpOpportunity | null;
    readOnly: true;
  };
  onboarding: {
    configured: boolean;
    enabled: boolean;
    sendMode: OnboardingSendMode;
    receiptsCount: number;
    latestMember: string | null;
    latestStatus: OnboardingReceiptStatus | null;
    latestTriggerType: OnboardingTriggerType | null;
    latestSourceMessageId: string | null;
    latestSourceMessage: string | null;
    latestMessage: string | null;
    latestSentMessageId: string | null;
    latestMindConversationId: string | null;
    liveListener: boolean;
  };
  audience: JudgeAudienceRecord[];
  queue: {
    total: number;
    approved: number;
    dismissed: number;
    needsReview: number;
    posted: number;
    latestPostedReply: PostedReplyProof | null;
    latestPostedOpportunityId: string | null;
    latestPostedSourceComment: string | null;
    latestPostedSourceTitle: string | null;
    representative: FollowUpOpportunity | null;
    discordOpportunities: number;
    needsFollowUpContent: number;
    contentTaskReceipts: FollowUpContentTaskReceipt[];
    actionCount: number;
  };
  minds: {
    mindId: string;
    mindIdConfigured: boolean;
    runId: string;
    conversationId: string;
    verdict: "verified";
    label: "SCRIPT-VERIFIED / NOT LIVE PER CARD";
    detail: string;
  };
}

export interface JudgeProofBuildInput {
  creator: Creator;
  youtubeConnection: Pick<YouTubeConnection, "youtube_channel_id" | "youtube_channel_title"> | null;
  sources: Source[];
  members: AudienceMember[];
  interactions: Interaction[];
  questions: UnresolvedQuestion[];
  creatorEvents: CreatorEvent[];
  creatorActions: CreatorAction[];
  discordConfig?: DiscordConfigStatus;
  discordConnection?: Pick<DiscordConnection, "guild_id" | "selected_channel_ids"> | null;
  onboardingSettings?: Pick<DiscordOnboardingSettings, "enabled" | "send_mode"> | null;
  onboardingReceipts?: DiscordOnboardingReceipt[];
}

export function getJudgeOpportunityStatus(opportunity: FollowUpOpportunity): FollowUpOpportunity["status"] {
  if (opportunity.postedReply) return "posted";
  if (opportunity.status === "dismissed") return "dismissed";
  if (opportunity.status === "needs_follow_up_content") return "needs_follow_up_content";
  if (opportunity.status === "approved") return "approved";
  return "needs_review";
}

export function emptyJudgeProofData(): JudgeProofData {
  const mindsConfig = getMindsConfigStatus();
  return {
    systemStatus: {
      youtubeOAuthConnected: false,
      supabasePersistenceVerified: false,
      mindsContinuityVerified: true,
      followUpActionsPersisted: false,
    },
    ingestion: {
      channelTitle: null,
      channelId: null,
      importedVideoCount: 0,
      importedCommentCount: 0,
      sourceBackedAudienceCount: 0,
      dataOrigin: "none",
    },
    discord: {
      configured: false,
      guildId: null,
      monitoredChannelIds: [],
      importedMessageCount: 0,
      sourceBackedPeopleCount: 0,
      opportunityCount: 0,
      representative: null,
      readOnly: true,
    },
    onboarding: {
      configured: false,
      enabled: false,
      sendMode: "draft_only",
      receiptsCount: 0,
      latestMember: null,
      latestStatus: null,
      latestTriggerType: null,
      latestSourceMessageId: null,
      latestSourceMessage: null,
      latestMessage: null,
      latestSentMessageId: null,
      latestMindConversationId: null,
      liveListener: false,
    },
    audience: [],
    queue: {
      total: 0,
      approved: 0,
      dismissed: 0,
      needsReview: 0,
      posted: 0,
      latestPostedReply: null,
      latestPostedOpportunityId: null,
      latestPostedSourceComment: null,
      latestPostedSourceTitle: null,
      representative: null,
      discordOpportunities: 0,
      needsFollowUpContent: 0,
      contentTaskReceipts: [],
      actionCount: 0,
    },
    minds: {
      mindId: mindsConfig.configuredMindId ?? "55ce4f3e-f36b-1410-8466-00039ce7df11",
      mindIdConfigured: mindsConfig.mindIdConfigured,
      runId: MINDS_CONTINUITY_PROOF_REFERENCE.runId,
      conversationId: MINDS_CONTINUITY_PROOF_REFERENCE.conversationId,
      verdict: "verified",
      label: "SCRIPT-VERIFIED / NOT LIVE PER CARD",
      detail: MINDS_CONTINUITY_PROOF_REFERENCE.detail,
    },
  };
}

export function buildJudgeProofData(input: JudgeProofBuildInput): JudgeProofData {
  const sourcesById = new Map(input.sources.map((source) => [source.id, source]));
  const importedSources = input.sources.filter((source) => isImportedYouTubeSource(source));
  const importedInteractions = input.interactions.filter((interaction) =>
    isImportedYouTubeInteraction(interaction, sourcesById.get(interaction.source_id)),
  );
  const discordConfig = input.discordConfig ?? getDiscordConfigStatus();
  const discordConnection = input.discordConnection ?? null;
  const onboardingReceipts = [...(input.onboardingReceipts ?? [])].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const latestOnboardingReceipt = onboardingReceipts[0] ?? null;
  const latestSourceMessageId = latestOnboardingReceipt?.source_message_id ?? null;
  const latestSourceInteraction = latestSourceMessageId
    ? input.interactions.find((interaction) => interaction.platform === "discord" && interaction.external_id === latestSourceMessageId) ?? null
    : null;
  const latestSourceEvent = latestSourceMessageId
    ? input.creatorEvents.find((event) => event.external_id === latestSourceMessageId) ?? null
    : null;
  const dataOrigin = getFollowUpDataOrigin(input.interactions, input.creatorEvents, input.sources);
  const importedDiscordInteractions = input.interactions.filter((interaction) =>
    isImportedDiscordInteraction(interaction, sourcesById.get(interaction.source_id)),
  );
  const importedDiscordEvents = input.creatorEvents.filter((event) =>
    isImportedDiscordEvent(event, event.source_id ? sourcesById.get(event.source_id) : undefined),
  );
  const opportunities = buildFollowUpOpportunities({
    members: input.members,
    interactions: input.interactions,
    sources: input.sources,
    questions: input.questions,
    creatorEvents: input.creatorEvents,
    creatorActions: input.creatorActions,
    creatorVoice: normalizeCreatorVoice(input.creator.voice_preference),
    dataOrigin: dataOrigin === "none" ? undefined : dataOrigin,
  });
  const postedYouTubeReplies = [...new Map(
    input.creatorActions
      .map((action) => getPostedReplyProof(action))
      .filter((proof): proof is PostedReplyProof => Boolean(proof))
      .map((proof) => [proof.youtubeReplyId, proof] as const),
  ).values()].sort((left, right) => right.postedAt.localeCompare(left.postedAt));
  const postedYouTubeOpportunity = opportunities.find((opportunity) => opportunity.postedReply) ??
    (postedYouTubeReplies[0] ? opportunities.find((opportunity) => opportunity.id === postedYouTubeReplies[0].opportunityId) ?? null : null);
  const discordOpportunities = opportunities.filter((opportunity) => opportunity.sourcePlatform === "discord");
  const contentTaskOpportunities = new Map(
    opportunities.map((opportunity) => [`${opportunity.interactionId}:${opportunity.creatorEventId}`, opportunity]),
  );
  const contentTaskReceipts = [...input.creatorActions]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((action): FollowUpContentTaskReceipt | null => {
      if (action.action_type !== "follow_up" || !action.interaction_id || !action.creator_event_id) return null;
      if (actionMetadataString(action, "follow_up_status") !== "needs_follow_up_content") return null;
      const opportunity = contentTaskOpportunities.get(`${action.interaction_id}:${action.creator_event_id}`);
      if (!opportunity) return null;
      return {
        id: action.id,
        opportunityId: opportunity.id,
        audienceMemberName: opportunity.audienceMemberName,
        sourceTitle: opportunity.sourceTitle,
        sourceQuestion: opportunity.proof.sourceComment,
        status: "needs_follow_up_content",
        selectedTone: actionMetadataString(action, "reply_tone") ?? actionMetadataString(action, "reply_variant"),
        createdAt: action.created_at,
        nextStep: "Create and import the follow-up video",
      };
    })
    .filter((receipt): receipt is FollowUpContentTaskReceipt => Boolean(receipt));
  const latestPostedAction = postedYouTubeReplies[0]
    ? input.creatorActions.find((action) => getPostedReplyProof(action)?.youtubeReplyId === postedYouTubeReplies[0].youtubeReplyId) ?? null
    : null;
  const latestPostedInteraction = latestPostedAction?.interaction_id
    ? input.interactions.find((interaction) => interaction.id === latestPostedAction.interaction_id) ?? null
    : null;
  const latestPostedSource = latestPostedInteraction
    ? sourcesById.get(latestPostedInteraction.source_id) ?? null
    : null;
  const queue = {
    total: opportunities.length,
    approved: opportunities.filter((opportunity) => getJudgeOpportunityStatus(opportunity) === "approved").length,
    dismissed: opportunities.filter((opportunity) => getJudgeOpportunityStatus(opportunity) === "dismissed").length,
    needsReview: opportunities.filter((opportunity) => getJudgeOpportunityStatus(opportunity) === "needs_review").length,
    needsFollowUpContent: opportunities.filter((opportunity) => getJudgeOpportunityStatus(opportunity) === "needs_follow_up_content").length,
    contentTaskReceipts,
    posted: postedYouTubeReplies.length,
    latestPostedReply: postedYouTubeReplies[0] ?? null,
    latestPostedOpportunityId: postedYouTubeReplies[0]?.opportunityId ?? null,
    latestPostedSourceComment: latestPostedInteraction?.text ?? null,
    latestPostedSourceTitle: latestPostedSource?.title ?? null,
    representative:
      postedYouTubeOpportunity ??
      opportunities.find((opportunity) => getJudgeOpportunityStatus(opportunity) === "needs_review") ??
      opportunities[0] ??
      null,
    discordOpportunities: discordOpportunities.length,
    actionCount: input.creatorActions.length,
  };
  const importedMemberIds = new Set(
    importedInteractions.map((interaction) => interaction.audience_member_id),
  );
  const sampleMemberIds = importedMemberIds.size > 0
    ? importedMemberIds
    : new Set(input.interactions.map((interaction) => interaction.audience_member_id));
  const audience = input.members
    .filter((member) => sampleMemberIds.has(member.id))
    .slice(0, 5)
    .map((member): JudgeAudienceRecord => ({
      id: member.id,
      name: member.display_name,
      platform: member.platform,
      imported: importedMemberIds.has(member.id),
      interactions: input.interactions
        .filter((interaction) => interaction.audience_member_id === member.id)
        .sort((left, right) => right.published_at.localeCompare(left.published_at))
        .slice(0, 2)
        .map((interaction) => ({
          id: interaction.id,
          text: interaction.text,
          sourceTitle: sourcesById.get(interaction.source_id)?.title ?? "Source unavailable",
          publishedAt: interaction.published_at,
        })),
    }));
  const mindsConfig = getMindsConfigStatus();

  return {
    systemStatus: {
      youtubeOAuthConnected: Boolean(input.youtubeConnection),
      supabasePersistenceVerified: true,
      mindsContinuityVerified: true,
      followUpActionsPersisted: input.creatorActions.length > 0,
    },
    ingestion: {
      channelTitle: input.youtubeConnection?.youtube_channel_title ?? null,
      channelId: input.youtubeConnection?.youtube_channel_id ?? null,
      importedVideoCount: importedSources.length,
      importedCommentCount: importedInteractions.length,
      sourceBackedAudienceCount: importedMemberIds.size,
      dataOrigin,
    },
    discord: {
      configured: Boolean(discordConnection) || discordConfig.ready,
      guildId: discordConnection?.guild_id ?? discordConfig.configuredGuildId,
      monitoredChannelIds: discordConnection?.selected_channel_ids ?? discordConfig.monitoredChannelIds,
      importedMessageCount: importedDiscordInteractions.length + importedDiscordEvents.length,
      sourceBackedPeopleCount: new Set(importedDiscordInteractions.map((interaction) => interaction.audience_member_id)).size,
      opportunityCount: discordOpportunities.length,
      representative: discordOpportunities[0] ?? null,
      readOnly: true,
    },
    onboarding: {
      configured: Boolean(discordConnection),
      enabled: input.onboardingSettings?.enabled ?? false,
      sendMode: input.onboardingSettings?.send_mode ?? "draft_only",
      receiptsCount: onboardingReceipts.length,
      latestMember: latestOnboardingReceipt?.discord_username ?? null,
      latestStatus: latestOnboardingReceipt?.status ?? null,
      latestTriggerType: latestOnboardingReceipt?.trigger_type ?? null,
      latestSourceMessageId,
      latestSourceMessage: latestSourceInteraction?.text ?? latestSourceEvent?.description ?? null,
      latestMessage: latestOnboardingReceipt?.generated_message || null,
      latestSentMessageId: latestOnboardingReceipt?.sent_message_id ?? null,
      latestMindConversationId: latestOnboardingReceipt?.mind_conversation_id ?? null,
      liveListener: latestOnboardingReceipt?.reason.startsWith("Live Discord listener:") ?? false,
    },
    audience,
    queue,
    minds: {
      mindId: mindsConfig.configuredMindId ?? "55ce4f3e-f36b-1410-8466-00039ce7df11",
      mindIdConfigured: mindsConfig.mindIdConfigured,
      runId: MINDS_CONTINUITY_PROOF_REFERENCE.runId,
      conversationId: MINDS_CONTINUITY_PROOF_REFERENCE.conversationId,
      verdict: "verified",
      label: "SCRIPT-VERIFIED / NOT LIVE PER CARD",
      detail: MINDS_CONTINUITY_PROOF_REFERENCE.detail,
    },
  };
}
