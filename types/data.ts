export const platforms = ["youtube", "youtube_live", "discord", "manual", "demo"] as const;
export type Platform = (typeof platforms)[number];

export const sourceTypes = ["video", "livestream", "discord_channel", "comment_import", "demo_dataset"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const interactionTypes = ["comment", "livestream_message", "creator_reply"] as const;
export type InteractionType = (typeof interactionTypes)[number];

export const questionStatuses = ["open", "answered", "dismissed"] as const;
export type QuestionStatus = (typeof questionStatuses)[number];

export const creatorEventTypes = [
  "content_published",
  "livestream_started",
  "product_update",
  "manual_event",
] as const;
export type CreatorEventType = (typeof creatorEventTypes)[number];

export const creatorActionTypes = ["reply", "follow_up", "dismiss", "mark_answered"] as const;
export type CreatorActionType = (typeof creatorActionTypes)[number];

export const creatorActionStatuses = [
  "pending",
  "approved",
  "dismissed",
  "completed",
  "failed",
] as const;
export type CreatorActionStatus = (typeof creatorActionStatuses)[number];

export const creatorVoices = ["warm", "direct", "beginner-friendly", "professional", "playful"] as const;
export type CreatorVoice = (typeof creatorVoices)[number];
export const DEFAULT_CREATOR_VOICE: CreatorVoice = "warm";

export function normalizeCreatorVoice(value: unknown): CreatorVoice {
  return typeof value === "string" && creatorVoices.includes(value as CreatorVoice)
    ? value as CreatorVoice
    : DEFAULT_CREATOR_VOICE;
}

export function isCreatorVoice(value: unknown): value is CreatorVoice {
  return typeof value === "string" && creatorVoices.includes(value as CreatorVoice);
}
