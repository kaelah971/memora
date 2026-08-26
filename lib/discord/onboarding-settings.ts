import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { isOnboardingSendMode, type OnboardingSendMode } from "@/lib/discord/onboarding-types";

export type DiscordOnboardingSettings = Tables<"discord_onboarding_settings">;

export interface DiscordOnboardingSettingsInput {
  enabled: boolean;
  sendMode: OnboardingSendMode;
  welcomeChannelId: string | null;
  resourceChannelId: string | null;
  questionChannelId: string | null;
  supportChannelId: string | null;
  builderChannelId: string | null;
  beginnerGuideText: string;
}

export interface DiscordOnboardingSettingsView extends DiscordOnboardingSettingsInput {
  connectionId: string;
  rowId: string | null;
  updatedAt: string | null;
}

export const DEFAULT_BEGINNER_GUIDE_TEXT = "Start in #announcements, then ask questions in #creator-questions. Use #support if you get stuck.";

export const onboardingChannelFields = [
  "welcomeChannelId",
  "resourceChannelId",
  "questionChannelId",
  "supportChannelId",
  "builderChannelId",
] as const;

type OnboardingChannelField = (typeof onboardingChannelFields)[number];

export function defaultDiscordOnboardingSettings(): DiscordOnboardingSettingsInput {
  return {
    enabled: false,
    sendMode: "draft_only",
    welcomeChannelId: null,
    resourceChannelId: null,
    questionChannelId: null,
    supportChannelId: null,
    builderChannelId: null,
    beginnerGuideText: DEFAULT_BEGINNER_GUIDE_TEXT,
  };
}

function savedChannelId(value: string | null, allowedChannelIds?: ReadonlySet<string>): string | null {
  if (!value || (allowedChannelIds && !allowedChannelIds.has(value))) return null;
  return value;
}

export function onboardingSettingsInput(
  settings: DiscordOnboardingSettings | null,
  allowedChannelIds?: readonly string[],
): DiscordOnboardingSettingsInput {
  if (!settings) return defaultDiscordOnboardingSettings();
  const allowed = allowedChannelIds ? new Set(allowedChannelIds) : undefined;
  return {
    enabled: settings.enabled,
    sendMode: isOnboardingSendMode(settings.send_mode) ? settings.send_mode : "draft_only",
    welcomeChannelId: savedChannelId(settings.welcome_channel_id, allowed),
    resourceChannelId: savedChannelId(settings.resource_channel_id, allowed),
    questionChannelId: savedChannelId(settings.question_channel_id, allowed),
    supportChannelId: savedChannelId(settings.support_channel_id, allowed),
    builderChannelId: savedChannelId(settings.builder_channel_id, allowed),
    beginnerGuideText: settings.beginner_guide_text,
  };
}

export function discordOnboardingSettingsView(
  connectionId: string,
  settings: DiscordOnboardingSettings | null,
  allowedChannelIds?: readonly string[],
): DiscordOnboardingSettingsView {
  return {
    connectionId,
    rowId: settings?.id ?? null,
    updatedAt: settings?.updated_at ?? null,
    ...onboardingSettingsInput(settings, allowedChannelIds),
  };
}

export function validateDiscordOnboardingSettings(
  input: DiscordOnboardingSettingsInput,
  selectedChannelIds: readonly string[],
): { data: DiscordOnboardingSettingsInput | null; error: string | null } {
  if (typeof input.enabled !== "boolean" || !isOnboardingSendMode(input.sendMode)) {
    return { data: null, error: "Choose a valid onboarding send mode." };
  }
  if (typeof input.beginnerGuideText !== "string" || input.beginnerGuideText.trim().length > 2_000) {
    return { data: null, error: "Keep the beginner guide text under 2,000 characters." };
  }

  const selected = new Set(selectedChannelIds);
  for (const field of onboardingChannelFields) {
    const value = input[field];
    if (value !== null && value !== "" && (typeof value !== "string" || !selected.has(value))) {
      return { data: null, error: "Onboarding channels must be selected and saved in the Discord connection first." };
    }
  }

  return {
    data: {
      enabled: input.enabled,
      sendMode: input.sendMode,
      ...Object.fromEntries(onboardingChannelFields.map((field) => [field, input[field] || null])) as Pick<DiscordOnboardingSettingsInput, OnboardingChannelField>,
      beginnerGuideText: input.beginnerGuideText.trim(),
    },
    error: null,
  };
}

export function parseDiscordOnboardingSettingsInput(body: unknown): { data: DiscordOnboardingSettingsInput | null; error: string | null } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { data: null, error: "Provide valid Discord onboarding settings." };
  }

  const value = body as Record<string, unknown>;
  if (typeof value.enabled !== "boolean" || !isOnboardingSendMode(value.sendMode) || typeof value.beginnerGuideText !== "string") {
    return { data: null, error: "Provide valid Discord onboarding settings." };
  }

  const channels: Partial<Record<OnboardingChannelField, string | null>> = {};
  for (const field of onboardingChannelFields) {
    const channelId = value[field];
    if (channelId === null || channelId === "") {
      channels[field] = null;
    } else if (typeof channelId === "string" && channelId.length <= 24) {
      channels[field] = channelId;
    } else {
      return { data: null, error: "Provide valid Discord onboarding settings." };
    }
  }

  return {
    data: {
      enabled: value.enabled,
      sendMode: value.sendMode,
      welcomeChannelId: channels.welcomeChannelId ?? null,
      resourceChannelId: channels.resourceChannelId ?? null,
      questionChannelId: channels.questionChannelId ?? null,
      supportChannelId: channels.supportChannelId ?? null,
      builderChannelId: channels.builderChannelId ?? null,
      beginnerGuideText: value.beginnerGuideText,
    },
    error: null,
  };
}

export function discordOnboardingSettingsRow(
  creatorId: string,
  connectionId: string,
  input: DiscordOnboardingSettingsInput,
): TablesInsert<"discord_onboarding_settings"> {
  return {
    creator_id: creatorId,
    discord_connection_id: connectionId,
    enabled: input.enabled,
    send_mode: input.sendMode,
    welcome_channel_id: input.welcomeChannelId,
    resource_channel_id: input.resourceChannelId,
    question_channel_id: input.questionChannelId,
    support_channel_id: input.supportChannelId,
    builder_channel_id: input.builderChannelId,
    beginner_guide_text: input.beginnerGuideText,
  };
}
