import type { DiscordChannel, DiscordMessage } from "@/lib/discord/client";
import type { DiscordOnboardingReceipt } from "@/lib/data/discord-onboarding";
import { isClearGuideRequest } from "@/lib/discord/onboarding";

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
  persistMessage(message: LiveDiscordMessage): Promise<void>;
  runGuideRequest(input: LiveGuideRequestInput): Promise<LiveOnboardingRunResult>;
}

export function classifyLiveDiscordMessage(
  message: LiveDiscordMessage,
  context: LiveDiscordListenerContext,
): LiveDiscordMessageClassification {
  if (context.botUserId && message.author.id === context.botUserId) return "ignored_self";
  if (message.author.bot) return "ignored_bot";
  if (!message.guildId || message.guildId !== context.guildId) return "ignored_guild";
  if (!context.selectedChannelIds.includes(message.channel.id)) return "ignored_channel";
  if (!message.content.trim()) return "ignored_empty";
  return isClearGuideRequest(message.content) ? "guide_request" : "persist_only";
}

function errorMessage(error: unknown): string {
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
  if (classification.startsWith("ignored_")) {
    return { classification, outcome: "ignored", receipt: null, error: null };
  }

  try {
    await dependencies.persistMessage(message);
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
