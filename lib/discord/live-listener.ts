import type { DiscordChannel, DiscordMessage } from "@/lib/discord/client";
import type { Tables } from "@/lib/supabase/database.types";
import { matchClearGuideRequest } from "@/lib/discord/onboarding";
import type { OnboardingSendMode } from "@/lib/discord/onboarding-types";
import { isNetworkFailure } from "@/lib/discord/errors";

type DiscordOnboardingReceipt = Tables<"discord_onboarding_receipts">;

export interface LiveDiscordMessage {
  id: string;
  guildId: string | null;
  channel: DiscordChannel;
  content: string;
  timestamp: string;
  author: DiscordMessage["author"];
}

export interface LiveDiscordListenerContext {
  guildId: string;
  selectedChannelIds: readonly string[];
  botUserId?: string | null;
  onboardingEnabled?: boolean;
  onboardingSendMode?: OnboardingSendMode;
  onboardingQuestionChannelId?: string | null;
}

export type LiveDiscordMessageClassification =
  | "ignored_self"
  | "ignored_bot"
  | "ignored_guild"
  | "ignored_channel"
  | "ignored_empty"
  | "persist_only"
  | "guide_request";

export interface LiveGuideRequestInput {
  userId: string;
  username: string;
  sourceChannelId: string;
  sourceMessageId: string;
  sourceMessageText: string;
}

export interface LiveOnboardingRunResult {
  receipt: DiscordOnboardingReceipt | null;
  duplicate: boolean;
  ignored: boolean;
  error: string | null;
}

export interface LiveDiscordMessageResult {
  classification: LiveDiscordMessageClassification;
  outcome: "ignored" | "persisted" | "drafted" | "sent" | "skipped" | "duplicate" | "failed";
  receipt: DiscordOnboardingReceipt | null;
  error: string | null;
}

export interface LiveDiscordMessageDependencies {
  persistMessage(message: LiveDiscordMessage, options?: { allowUnmonitored?: boolean }): Promise<void>;
  runGuideRequest(input: LiveGuideRequestInput): Promise<LiveOnboardingRunResult>;
  logDecision?(decision: LiveDiscordMessageDecision): void;
}

export interface LiveDiscordMessageDecision {
  classification: LiveDiscordMessageClassification;
  messageChannelId: string;
  questionChannelId: string | null;
  settingsEnabled: boolean | null;
  sendMode: OnboardingSendMode | null;
  triggerMatched: boolean;
  triggerReason: string;
}

export function classifyLiveDiscordMessage(
  message: LiveDiscordMessage,
  context: LiveDiscordListenerContext,
): LiveDiscordMessageClassification {
  if (context.botUserId && message.author.id === context.botUserId) return "ignored_self";
  if (message.author.bot) return "ignored_bot";
  if (!message.guildId || message.guildId !== context.guildId) return "ignored_guild";
  if (!message.content.trim()) return "ignored_empty";
  const trigger = matchClearGuideRequest(message.content);
  if (!context.selectedChannelIds.includes(message.channel.id)) return trigger.matched ? "persist_only" : "ignored_channel";
  return trigger.matched ? "guide_request" : "persist_only";
}

function errorMessage(error: unknown): string {
  if (isNetworkFailure(error)) return "network_fetch_failed";
  return error instanceof Error ? error.message : "The live Discord message could not be processed.";
}

function messageUsername(message: LiveDiscordMessage): string {
  return message.author.global_name?.trim() || message.author.username?.trim() || `Discord member ${message.author.id}`;
}

export async function handleLiveDiscordMessage(
  message: LiveDiscordMessage,
  context: LiveDiscordListenerContext,
  dependencies: LiveDiscordMessageDependencies,
): Promise<LiveDiscordMessageResult> {
  const classification = classifyLiveDiscordMessage(message, context);
  const trigger = matchClearGuideRequest(message.content);
  dependencies.logDecision?.({
    classification,
    messageChannelId: message.channel.id,
    questionChannelId: context.onboardingQuestionChannelId ?? null,
    settingsEnabled: context.onboardingEnabled ?? null,
    sendMode: context.onboardingSendMode ?? null,
    triggerMatched: trigger.matched,
    triggerReason: trigger.reason,
  });
  if (classification.startsWith("ignored_")) {
    return { classification, outcome: "ignored", receipt: null, error: null };
  }

  try {
    await dependencies.persistMessage(message, { allowUnmonitored: classification === "persist_only" && trigger.matched });
  } catch (error) {
    return { classification, outcome: "failed", receipt: null, error: errorMessage(error) };
  }

  if (classification === "persist_only") {
    return { classification, outcome: "persisted", receipt: null, error: null };
  }

  const onboarding = await dependencies.runGuideRequest({
    userId: message.author.id,
    username: messageUsername(message),
    sourceChannelId: message.channel.id,
    sourceMessageId: message.id,
    sourceMessageText: message.content.trim(),
  });
  if (onboarding.error) {
    return { classification, outcome: "failed", receipt: onboarding.receipt, error: onboarding.error };
  }
  if (onboarding.ignored) {
    return { classification, outcome: "ignored", receipt: onboarding.receipt, error: null };
  }
  if (onboarding.duplicate) {
    return { classification, outcome: "duplicate", receipt: onboarding.receipt, error: null };
  }

  const outcome = onboarding.receipt?.status ?? "persisted";
  return {
    classification,
    outcome: outcome === "sent" || outcome === "drafted" || outcome === "skipped" || outcome === "failed" ? outcome : "persisted",
    receipt: onboarding.receipt,
    error: null,
  };
}
