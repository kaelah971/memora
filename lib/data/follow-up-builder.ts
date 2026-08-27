import type { Tables } from "@/lib/supabase/database.types";
import { DEFAULT_CREATOR_VOICE, normalizeCreatorVoice, type CreatorVoice } from "@/types/data";

type AudienceMember = Tables<"audience_members">;
type Interaction = Tables<"interactions">;
type Source = Tables<"sources">;
type UnresolvedQuestion = Tables<"unresolved_questions">;
type CreatorEvent = Tables<"creator_events">;
type CreatorAction = Tables<"creator_actions">;
type MindReasoningRow = Tables<"follow_up_mind_reasoning">;

export type FollowUpStatus = "needs_review" | "approved" | "dismissed" | "posted";
export type FollowUpDataOrigin = "real-youtube" | "real-discord" | "real-multi-source" | "demo-seed-fallback" | "none";

export interface MindsContinuityReference {
  available: true;
  label: "Minds continuity verified in script proof";
  runId: string;
  conversationId: string;
  detail: string;
}

export const MINDS_CONTINUITY_PROOF_REFERENCE: MindsContinuityReference = {
  available: true,
  label: "Minds continuity verified in script proof",
  runId: "memora-spike-1787668157736",
  conversationId: "1abb503e-f36b-1410-8466-00039ce7df11",
  detail:
    "The latest script proof verified that a later creator event can connect back to an earlier viewer question. This queue uses persisted Supabase facts and does not run Minds live for each card.",
};

export interface FollowUpProof {
  sourceComment: string;
  rememberedContext: string;
  newContent: string;
  followUpReason: string;
  mindsContinuity: MindsContinuityReference;
}

export interface PostedReplyProof {
  opportunityId: string;
  parentCommentId: string;
  youtubeReplyId: string;
  replyText: string;
  postedAt: string;
  sourceVideoId: string | null;
  sourceId: string;
  audienceMemberId: string;
}

export interface MindReasoningVariants {
  warm: string | null;
  short: string | null;
  beginnerFriendly: string | null;
  advisory: FollowUpMindAdvisory | null;
}

export interface FollowUpMindAdvisory {
  fanQuestion: string | null;
  sourceContext: string | null;
  likelyNeed: string | null;
  recommendedAction: string | null;
  replyNow: string | null;
  followUpOutline: string | null;
  attachedVideoStatus: string | null;
}

export interface FollowUpMindReasoning {
  id: string;
  mindId: string;
  conversationId: string;
  reasoningText: string;
  tone: string;
  variants: MindReasoningVariants;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpOpportunity {
  id: string;
  audienceMemberId: string;
  audienceMemberName: string;
  interactionId: string;
  commentText: string;
  commentPublishedAt: string;
  sourceId: string;
  sourceTitle: string;
  sourceDescription: string | null;
  sourceUrl: string | null;
  sourcePlatform: string;
  creatorEventId: string;
  creatorEventTitle: string;
  creatorEventDescription: string | null;
  creatorEventOccurredAt: string;
  creatorEventSourceTitle: string | null;
  creatorEventSourceUrl: string | null;
  creatorEventVideoId: string | null;
  creatorEventVideoUrl: string | null;
  whyNow: string;
  suggestedReply: string;
  confidenceLabel: string;
  status: FollowUpStatus;
  replyStatus: "draft_only" | "posted";
  postedReply: PostedReplyProof | null;
  mindReasoning: FollowUpMindReasoning | null;
  onboardingContext?: string | null;
  dataOrigin: Exclude<FollowUpDataOrigin, "none">;
  proof: FollowUpProof;
}

export function followUpOpportunityAnchor(opportunityId: string): string {
  return `follow-up-opportunity-${opportunityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export interface FollowUpActionVisibility {
  showApprove: boolean;
  showDismiss: boolean;
  showPost: boolean;
  showPostedProof: boolean;
}

export function getFollowUpActionVisibility(
  status: FollowUpStatus,
  hasPostedProof: boolean,
): FollowUpActionVisibility {
  return {
    showApprove: status === "needs_review" && !hasPostedProof,
    showDismiss: status === "needs_review" && !hasPostedProof,
    showPost: status === "approved" && !hasPostedProof,
    showPostedProof: hasPostedProof,
  };
}

export interface FollowUpQueue {
  opportunities: FollowUpOpportunity[];
  dataOrigin: FollowUpDataOrigin;
  importedInteractionCount: number;
  importedEventCount: number;
}

export interface FollowUpBuildInput {
  members: AudienceMember[];
  interactions: Interaction[];
  sources: Source[];
  questions: UnresolvedQuestion[];
  creatorEvents: CreatorEvent[];
  creatorActions: CreatorAction[];
  mindReasoning?: MindReasoningRow[];
  dataOrigin?: Exclude<FollowUpDataOrigin, "none">;
  creatorVoice?: CreatorVoice;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDemoMarker(value: unknown): boolean {
  return isRecord(value) && value.demo === true;
}

function isDemoSource(source: Source | undefined): boolean {
  return Boolean(
    source &&
      (source.source_type === "demo_dataset" ||
        source.platform === "manual" ||
        hasDemoMarker(source.metadata)),
  );
}

export function isDemoInteraction(interaction: Interaction, source: Source | undefined): boolean {
  return hasDemoMarker(interaction.raw_metadata) || isDemoSource(source);
}

export function isDemoEvent(event: CreatorEvent, source: Source | undefined): boolean {
  return hasDemoMarker(event.payload) || isDemoSource(source);
}

export function isImportedYouTubeSource(source: Source | undefined): boolean {
  return Boolean(source?.platform === "youtube" && source.source_type === "video" && !isDemoSource(source));
}

export function isImportedYouTubeInteraction(interaction: Interaction, source: Source | undefined): boolean {
  return interaction.platform === "youtube" && isImportedYouTubeSource(source) && !isDemoInteraction(interaction, source);
}

export function isImportedYouTubeEvent(event: CreatorEvent, source: Source | undefined): boolean {
  return isImportedYouTubeSource(source) && !isDemoEvent(event, source);
}

export function isImportedDiscordSource(source: Source | undefined): boolean {
  return Boolean(source?.platform === "discord" && source.source_type === "discord_channel" && !isDemoSource(source));
}

export function isImportedDiscordInteraction(interaction: Interaction, source: Source | undefined): boolean {
  return interaction.platform === "discord" && interaction.interaction_type !== "creator_reply" && isImportedDiscordSource(source) && !isDemoInteraction(interaction, source);
}

export function isImportedDiscordEvent(event: CreatorEvent, source: Source | undefined): boolean {
  return isImportedDiscordSource(source) && !isDemoEvent(event, source);
}

export function isImportedInteraction(interaction: Interaction, source: Source | undefined): boolean {
  return isImportedYouTubeInteraction(interaction, source) || isImportedDiscordInteraction(interaction, source);
}

export function isImportedEvent(event: CreatorEvent, source: Source | undefined): boolean {
  return isImportedYouTubeEvent(event, source) || isImportedDiscordEvent(event, source);
}

function dataOriginForImportedRows(
  interactions: Interaction[],
  creatorEvents: CreatorEvent[],
  sourcesById: Map<string, Source>,
): Exclude<FollowUpDataOrigin, "none" | "demo-seed-fallback"> {
  const platforms = new Set([
    ...interactions.map((interaction) => interaction.platform),
    ...creatorEvents.flatMap((event) => event.source_id ? [sourcesById.get(event.source_id)?.platform] : []),
  ]);
  if (platforms.size > 1) return "real-multi-source";
  return platforms.has("discord") ? "real-discord" : "real-youtube";
}

export function getFollowUpDataOrigin(
  interactions: Interaction[],
  creatorEvents: CreatorEvent[],
  sources: Source[],
): FollowUpDataOrigin {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const importedInteractions = interactions.filter((interaction) => isImportedInteraction(interaction, sourcesById.get(interaction.source_id)));
  const importedEvents = creatorEvents.filter((event) => isImportedEvent(event, event.source_id ? sourcesById.get(event.source_id) : undefined));
  if (importedInteractions.length > 0 && importedEvents.length > 0) {
    return dataOriginForImportedRows(importedInteractions, importedEvents, sourcesById);
  }
  return interactions.length > 0 && creatorEvents.length > 0 ? "demo-seed-fallback" : "none";
}

function sourceChannelId(source: Source | undefined): string | null {
  if (!source || !isRecord(source.metadata)) return null;
  const channelId = source.metadata.youtube_channel_id ?? source.metadata.discord_channel_id;
  return typeof channelId === "string" ? channelId : null;
}

function tokenize(value: string): string[] {
  const ignored = new Set([
    "about",
    "after",
    "again",
    "also",
    "been",
    "beginners",
    "could",
    "does",
    "from",
    "have",
    "help",
    "into",
    "just",
    "like",
    "make",
    "more",
    "should",
    "that",
    "their",
    "there",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
  ]);

  return [...new Set((value.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []).filter((word) => !ignored.has(word)))];
}

function jsonText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(" ");
  if (!isRecord(value)) return "";
  return Object.values(value)
    .filter((item): item is string => typeof item === "string")
    .join(" ");
}

function isQuestionLike(text: string): boolean {
  return /\?/.test(text) || /^(can|could|do|does|how|is|are|should|what|when|where|which|who|will|would)\b/i.test(text.trim());
}

function actionKey(interactionId: string, creatorEventId: string): string {
  return `${interactionId}:${creatorEventId}`;
}

function stringMetadata(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const URL_PATTERN = /https?:\/\/[^\s<>"')]+/gi;
const YOUTUBE_HOSTS = new Set([
  "youtu.be",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

function validYouTubeVideoId(value: unknown): string | null {
  return typeof value === "string" && YOUTUBE_VIDEO_ID_PATTERN.test(value) ? value : null;
}

export function extractYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  const directId = validYouTubeVideoId(value.trim());
  if (directId) return directId;

  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol) || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (parsed.hostname.toLowerCase() === "youtu.be") {
      return validYouTubeVideoId(parsed.pathname.split("/").filter(Boolean)[0]);
    }
    const watchId = parsed.pathname === "/watch" ? parsed.searchParams.get("v") : null;
    if (watchId) return validYouTubeVideoId(watchId);
    const pathMatch = parsed.pathname.match(/^\/(?:embed|live|shorts)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
    return validYouTubeVideoId(pathMatch?.[1]);
  } catch {
    return null;
  }
}

export function getCreatorEventYouTubeVideoId(
  event: CreatorEvent,
  eventSource: Source | undefined,
): string | null {
  if (!isImportedYouTubeEvent(event, eventSource)) return null;
  const payload = isRecord(event.payload) ? event.payload : {};
  const metadata = isRecord(eventSource?.metadata) ? eventSource.metadata : {};
  const payloadCandidates = [
    payload.video_id,
    payload.youtube_video_id,
    payload.video_url,
  ];
  const payloadVideoId = payloadCandidates.reduce<string | null>(
    (videoId, candidate) => videoId ?? extractYouTubeVideoId(typeof candidate === "string" ? candidate : null),
    null,
  );
  if (payloadVideoId) return payloadVideoId;

  const eventVideoId = extractYouTubeVideoId(event.external_id);
  if (eventVideoId) return eventVideoId;

  const sourceVideoId = extractYouTubeVideoId(stringMetadata(metadata.youtube_video_id));
  const sourceExternalId = extractYouTubeVideoId(eventSource?.external_id);
  const sourceUrlId = extractYouTubeVideoId(eventSource?.url);
  if (sourceVideoId && sourceVideoId === sourceExternalId) return sourceVideoId;
  if (sourceUrlId && sourceUrlId === sourceExternalId) return sourceUrlId;
  return null;
}

export function getCreatorEventYouTubeVideoUrl(
  event: CreatorEvent,
  eventSource: Source | undefined,
): string | null {
  const videoId = getCreatorEventYouTubeVideoId(event, eventSource);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

function draftLinksAreSafe(draft: string | null | undefined, trustedVideoUrl: string | null): boolean {
  if (!draft) return false;
  const links = draft.match(URL_PATTERN) ?? [];
  return links.every((candidate) => {
    const punctuation = candidate.match(/[.,!?;:]+$/)?.[0] ?? "";
    const bareCandidate = candidate.slice(0, candidate.length - punctuation.length);
    return Boolean(trustedVideoUrl && bareCandidate === trustedVideoUrl);
  });
}

function sourceDescription(source: Source | undefined): string | null {
  if (!source || !isRecord(source.metadata)) return null;
  return stringMetadata(source.metadata.description) ?? stringMetadata(source.metadata.video_description);
}

function mindReasoningFromRow(row: MindReasoningRow): FollowUpMindReasoning {
  const variants = isRecord(row.variants) ? row.variants : {};
  const advisory = isRecord(variants.advisory) ? variants.advisory : null;
  return {
    id: row.id,
    mindId: row.mind_id,
    conversationId: row.conversation_id,
    reasoningText: row.reasoning_text,
    tone: row.tone,
    variants: {
      warm: stringMetadata(variants.warm),
      short: stringMetadata(variants.short),
      beginnerFriendly: stringMetadata(variants.beginner_friendly),
      advisory: advisory
        ? {
            fanQuestion: stringMetadata(advisory.fan_question),
            sourceContext: stringMetadata(advisory.source_context),
            likelyNeed: stringMetadata(advisory.likely_need),
            recommendedAction: stringMetadata(advisory.recommended_action),
            replyNow: stringMetadata(advisory.reply_now),
            followUpOutline: stringMetadata(advisory.follow_up_outline),
            attachedVideoStatus: stringMetadata(advisory.attached_video_status),
          }
        : null,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function onboardingContextForMember(memberId: string, interactions: Interaction[]): string | null {
  const hasOnboardingMemory = interactions.some((interaction) =>
    interaction.audience_member_id === memberId &&
    interaction.creator_replied &&
    isRecord(interaction.raw_metadata) &&
    typeof interaction.raw_metadata.onboarding_receipt_id === "string",
  );
  return hasOnboardingMemory ? "This member was onboarded before and pointed to beginner resources." : null;
}

export function getPostedReplyProof(action: CreatorAction): PostedReplyProof | null {
  if (!isRecord(action.metadata) || action.metadata.posting_status !== "posted") return null;
  const opportunityId = stringMetadata(action.metadata.opportunity_id);
  const parentCommentId = stringMetadata(action.metadata.parent_comment_id);
  const youtubeReplyId = stringMetadata(action.metadata.youtube_reply_id);
  const replyText = stringMetadata(action.metadata.reply_text) ?? action.text;
  const postedAt = stringMetadata(action.metadata.posted_at);
  const sourceId = stringMetadata(action.metadata.source_id);
  const audienceMemberId = action.audience_member_id;
  if (!opportunityId || !parentCommentId || !youtubeReplyId || !replyText || !postedAt || !sourceId || !audienceMemberId) return null;

  return {
    opportunityId,
    parentCommentId,
    youtubeReplyId,
    replyText,
    postedAt,
    sourceVideoId: stringMetadata(action.metadata.source_video_id),
    sourceId,
    audienceMemberId,
  };
}

function statusForAction(
  actionsByKey: Map<string, CreatorAction>,
  postedRepliesByKey: Map<string, PostedReplyProof>,
  interactionId: string,
  creatorEventId: string,
): FollowUpStatus {
  const key = actionKey(interactionId, creatorEventId);
  if (postedRepliesByKey.has(key)) return "posted";
  const action = actionsByKey.get(key);
  if (!action) return "needs_review";
  if (action.action_type === "dismiss" || action.status === "dismissed") return "dismissed";
  if (action.status === "approved") return "approved";
  return "needs_review";
}

function suggestedReplyForVoice(
  voice: CreatorVoice,
  memberName: string,
  commentText: string,
  eventTitle: string,
  eventUrl: string | null,
): string {
  const safeMemberName = memberName.replace(/https?:\/\/[^\s<>"')]+/gi, "").trim() || "there";
  const safeCommentText = commentText.replace(/https?:\/\/[^\s<>"')]+/gi, "").replace(/[ \t]{2,}/g, " ").trim() || "your question";
  const safeEventTitle = eventTitle.replace(/https?:\/\/[^\s<>"')]+/gi, "").replace(/[ \t]{2,}/g, " ").trim() || "this new content";
  const destination = eventUrl ? ` ${eventUrl}` : "";
  switch (voice) {
    case "direct":
      return `${safeMemberName}, you asked “${safeCommentText}” and ${eventUrl ? `this new content answers it: ${safeEventTitle}.${destination}` : `I'm going to make a follow-up on ${safeEventTitle} first.`}`;
    case "beginner-friendly":
      return `Hi ${safeMemberName}, you asked “${safeCommentText}”. ${eventUrl ? `This is a simple place to start: ${safeEventTitle}.${destination}` : `I'm going to make a simple follow-up on ${safeEventTitle} first.`}`;
    case "professional":
      return `Hi ${safeMemberName}, following up on your question: “${safeCommentText}”. ${eventUrl ? `This new content may be useful: ${safeEventTitle}.${destination}` : `I'm going to make a useful follow-up on ${safeEventTitle} first.`}`;
    case "playful":
      return `Hey ${safeMemberName}, circling back to your “${safeCommentText}” question. ${eventUrl ? `This new content might be just the thing: ${safeEventTitle}.${destination}` : `I may make a follow-up on ${safeEventTitle} first.`}`;
    case "warm":
    default:
      return `Hey ${safeMemberName}, you asked “${safeCommentText}” and ${eventUrl ? `I thought this new video might help: ${safeEventTitle} - ${eventUrl}` : `I'm going to make a follow-up on ${safeEventTitle} first.`}`;
  }
}

function chooseDataRows(input: FollowUpBuildInput): {
  interactions: Interaction[];
  creatorEvents: CreatorEvent[];
  dataOrigin: Exclude<FollowUpDataOrigin, "none">;
} {
  const sourcesById = new Map(input.sources.map((source) => [source.id, source]));
  const importedInteractions = input.interactions.filter((interaction) => {
    const source = sourcesById.get(interaction.source_id);
    return isImportedInteraction(interaction, source);
  });
  const importedEvents = input.creatorEvents.filter((event) => {
    const source = event.source_id ? sourcesById.get(event.source_id) : undefined;
    return isImportedEvent(event, source);
  });

  if (importedInteractions.length > 0 && importedEvents.length > 0) {
    return {
      interactions: importedInteractions,
      creatorEvents: importedEvents,
      dataOrigin: dataOriginForImportedRows(importedInteractions, importedEvents, sourcesById),
    };
  }

  const demoInteractions = input.interactions.filter((interaction) =>
    isDemoInteraction(interaction, sourcesById.get(interaction.source_id)),
  );
  const demoEvents = input.creatorEvents.filter((event) =>
    isDemoEvent(event, event.source_id ? sourcesById.get(event.source_id) : undefined),
  );

  return {
    interactions: demoInteractions,
    creatorEvents: demoEvents,
    dataOrigin: "demo-seed-fallback",
  };
}

export function buildFollowUpOpportunities(input: FollowUpBuildInput): FollowUpOpportunity[] {
  const sourcesById = new Map(input.sources.map((source) => [source.id, source]));
  const membersById = new Map(input.members.map((member) => [member.id, member]));
  const questionsByInteraction = new Map(
    input.questions
      .filter((question) => question.status === "open")
      .map((question) => [question.interaction_id, question]),
  );
  const actionsByKey = new Map<string, CreatorAction>();
  const postedRepliesByKey = new Map<string, PostedReplyProof>();
  const preferredEventByInteraction = new Map<string, string>();
  const mindReasoningByOpportunity = new Map<string, FollowUpMindReasoning>();
  for (const action of [...input.creatorActions].sort((left, right) => right.created_at.localeCompare(left.created_at))) {
    if (!action.interaction_id || !action.creator_event_id) continue;
    const key = actionKey(action.interaction_id, action.creator_event_id);
    if (!actionsByKey.has(key)) actionsByKey.set(key, action);
    const postedReply = getPostedReplyProof(action);
    if (postedReply && !postedRepliesByKey.has(key)) postedRepliesByKey.set(key, postedReply);
    if (action.interaction_id && action.creator_event_id && (!preferredEventByInteraction.has(action.interaction_id) || postedReply)) {
      preferredEventByInteraction.set(action.interaction_id, action.creator_event_id);
    }
  }
  for (const row of [...(input.mindReasoning ?? [])].sort((left, right) => right.updated_at.localeCompare(left.updated_at))) {
    if (!mindReasoningByOpportunity.has(row.opportunity_id)) {
      mindReasoningByOpportunity.set(row.opportunity_id, mindReasoningFromRow(row));
    }
  }

  const selected = chooseDataRows(input);
  const dataOrigin = input.dataOrigin ?? selected.dataOrigin;
  const opportunities: FollowUpOpportunity[] = [];

  for (const interaction of selected.interactions) {
    if (interaction.interaction_type === "creator_reply") continue;
    const source = sourcesById.get(interaction.source_id);
    const member = membersById.get(interaction.audience_member_id);
    const question = questionsByInteraction.get(interaction.id);
    if (!source || !member || (!question && !isQuestionLike(interaction.text))) continue;

    const commentTerms = new Set(tokenize(interaction.text));
    const commentChannelId = sourceChannelId(source);
    const preferredEventId = preferredEventByInteraction.get(interaction.id);
    const matchingEvents = selected.creatorEvents
      .map((event) => {
        const eventSource = event.source_id ? sourcesById.get(event.source_id) : undefined;
        const sameSource = event.source_id === interaction.source_id;
        const sameChannel = Boolean(commentChannelId && commentChannelId === sourceChannelId(eventSource));
        const persistedActionMatch = event.id === preferredEventId;
        const eventTime = Date.parse(event.occurred_at);
        const interactionTime = Date.parse(interaction.published_at);
        if (
          !sameSource &&
          !sameChannel &&
          Number.isFinite(eventTime) &&
          Number.isFinite(interactionTime) &&
          eventTime < interactionTime
        ) return null;

        const eventText = [event.title, event.description ?? "", jsonText(event.payload)].join(" ");
        const matchedTerms = tokenize(eventText).filter((term) => commentTerms.has(term));
        if (matchedTerms.length === 0 && !sameSource && !sameChannel && !persistedActionMatch) return null;

        const score =
          matchedTerms.length * 2 +
          (question ? 3 : 1) +
          (sameSource ? 3 : 0) +
          (sameChannel ? 2 : 0) +
          (persistedActionMatch ? 100 : 0);
        return { event, eventSource, matchedTerms, sameSource, sameChannel, score };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((left, right) => right.score - left.score || right.event.occurred_at.localeCompare(left.event.occurred_at));

    const match = matchingEvents[0];
    if (!match) continue;

    const readableTerms = match.matchedTerms.slice(0, 3).join(", ") || "the same source context";
    const questionState = question ? "open question" : "question";
    const whyNow = match.sameSource
      ? `This imported creator event is connected to the same source and gives ${member.display_name}'s ${questionState} a concrete follow-up context.`
      : `The new content shares ${readableTerms} with ${member.display_name}'s ${questionState} and arrived after the original comment, giving you a timely reason to reconnect.`;
    const rememberedContext = `${member.display_name} asked: “${interaction.text}”${question ? " This question is still open." : ""}`;
    const newContent = `${match.event.title}${match.event.description ? `: ${match.event.description}` : ""}`;
    const creatorVoice = normalizeCreatorVoice(input.creatorVoice ?? DEFAULT_CREATOR_VOICE);
    const suggestedReply = suggestedReplyForVoice(
      creatorVoice,
      member.display_name,
      interaction.text,
      match.event.title,
      getCreatorEventYouTubeVideoUrl(match.event, match.eventSource),
    );
    const currentAction = actionsByKey.get(actionKey(interaction.id, match.event.id));
    const calculatedStatus = statusForAction(actionsByKey, postedRepliesByKey, interaction.id, match.event.id);
    const status = calculatedStatus === "approved" && !draftLinksAreSafe(currentAction?.text, getCreatorEventYouTubeVideoUrl(match.event, match.eventSource))
      ? "needs_review"
      : calculatedStatus;
    const confidenceLabel = question && match.matchedTerms.length >= 2
      ? "Strong evidence: open question plus shared topic"
      : match.sameSource
        ? "Strong evidence: same source plus question"
        : `Clear evidence: shared topic (${readableTerms})`;

    opportunities.push({
      id: `follow-up:${interaction.id}:${match.event.id}`,
      audienceMemberId: member.id,
      audienceMemberName: member.display_name,
      interactionId: interaction.id,
      commentText: interaction.text,
      commentPublishedAt: interaction.published_at,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceDescription: sourceDescription(source),
      sourceUrl: source.url,
      sourcePlatform: source.platform,
      creatorEventId: match.event.id,
      creatorEventTitle: match.event.title,
      creatorEventDescription: match.event.description,
      creatorEventOccurredAt: match.event.occurred_at,
      creatorEventSourceTitle: match.eventSource?.title ?? null,
      creatorEventSourceUrl: match.eventSource?.url ?? null,
      creatorEventVideoId: getCreatorEventYouTubeVideoId(match.event, match.eventSource),
      creatorEventVideoUrl: getCreatorEventYouTubeVideoUrl(match.event, match.eventSource),
      whyNow,
      suggestedReply,
      confidenceLabel,
       status,
       replyStatus: postedRepliesByKey.has(actionKey(interaction.id, match.event.id)) ? "posted" : "draft_only",
       postedReply: postedRepliesByKey.get(actionKey(interaction.id, match.event.id)) ?? null,
       mindReasoning: mindReasoningByOpportunity.get(`follow-up:${interaction.id}:${match.event.id}`) ?? null,
       onboardingContext: onboardingContextForMember(member.id, input.interactions),
       dataOrigin,
      proof: {
        sourceComment: interaction.text,
        rememberedContext,
        newContent,
        followUpReason: whyNow,
        mindsContinuity: MINDS_CONTINUITY_PROOF_REFERENCE,
      },
    });
  }

  return opportunities.sort((left, right) => right.creatorEventOccurredAt.localeCompare(left.creatorEventOccurredAt));
}
