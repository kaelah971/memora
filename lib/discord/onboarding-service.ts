import "server-only";

import {
  getDiscordConnection,
  listDiscordConnectionChannels,
} from "@/lib/data/discord-connection";
import {
  createDiscordOnboardingReceipt,
  findRecentDiscordOnboardingReceipt,
  getDiscordMemberMemory,
  getDiscordOnboardingSettings,
  listRecentDiscordInteractions,
  recordOnboardingMemory,
  updateDiscordOnboardingReceipt,
  updateOnboardingMemoryStatus,
  type DiscordOnboardingReceipt,
  type DiscordOnboardingSettingsInput,
} from "@/lib/data/discord-onboarding";
import { onboardingSettingsInput } from "@/lib/discord/onboarding-settings";
import { createDiscordApiClient } from "@/lib/discord/client";
import { isClearGuideRequest, canAutoSendOnboarding, type OnboardingChannelContext } from "@/lib/discord/onboarding";
import { readDiscordBotToken } from "@/lib/discord/config";
import { toDiscordIntegrationError } from "@/lib/discord/errors";
import type { OnboardingTriggerType } from "@/lib/discord/onboarding-types";
import { generateDiscordOnboardingMessage } from "@/lib/minds/onboarding";
import { toMindsErrorInfo } from "@/lib/minds/errors";
import { BUILDER_API_KEY_ENV } from "@/lib/minds/config";
import { getCreatorWorkspace } from "@/lib/data/creators";
import { normalizeCreatorVoice, type CreatorVoice } from "@/types/data";

export interface DiscordOnboardingProcessResult {
  inspected: number;
  guideRequestsDetected: number;
  receiptsCreated: number;
  sent: number;
  drafted: number;
  skipped: number;
  failed: number;
  receipts: DiscordOnboardingReceipt[];
}

export interface DiscordOnboardingContext {
  creatorId: string;
  connectionId: string;
  guildId: string;
  communityName: string;
  creatorVoice: CreatorVoice;
  settings: DiscordOnboardingSettingsInput;
  channels: OnboardingChannelContext[];
}

export interface DiscordOnboardingMessageResult {
  receipt: DiscordOnboardingReceipt | null;
  duplicate: boolean;
  ignored: boolean;
  error: string | null;
}

function emptyResult(): DiscordOnboardingProcessResult {
  return { inspected: 0, guideRequestsDetected: 0, receiptsCreated: 0, sent: 0, drafted: 0, skipped: 0, failed: 0, receipts: [] };
}

function cleanHandle(value: string): string {
  return value.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 100) || "New member";
}

function safeUserIdForManualTest(handle: string): string {
  return `manual-test:${handle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "new-member"}`;
}

function safeMessageError(error: unknown): string {
  const discordError = toDiscordIntegrationError(error);
  if (discordError.code !== "API" || error instanceof Error && error.name === "DiscordIntegrationError") return discordError.message;
  const mindsError = toMindsErrorInfo(error, process.env[BUILDER_API_KEY_ENV]);
  return mindsError.message;
}

function listenerReason(origin: "live_listener" | undefined, reason: string): string {
  return origin === "live_listener" ? `Live Discord listener: ${reason}` : reason;
}

function settingsValue(settings: DiscordOnboardingContext["settings"], key: keyof Pick<DiscordOnboardingSettingsInput, "welcomeChannelId" | "resourceChannelId" | "questionChannelId" | "supportChannelId" | "builderChannelId">): string | null {
  const value = settings[key];
  return typeof value === "string" && value ? value : null;
}

function targetChannelId(
  settings: DiscordOnboardingContext["settings"],
  triggerType: OnboardingTriggerType,
  channels: OnboardingChannelContext[],
): string | null {
  const configured = triggerType === "guide_request" || triggerType === "first_message"
    ? [settingsValue(settings, "resourceChannelId"), settingsValue(settings, "welcomeChannelId"), settingsValue(settings, "questionChannelId")]
    : [settingsValue(settings, "welcomeChannelId"), settingsValue(settings, "resourceChannelId")];
  return [...configured, channels[0]?.id ?? null].find((id): id is string => Boolean(id && channels.some((channel) => channel.id === id))) ?? null;
}

function labeledChannels(settings: DiscordOnboardingContext["settings"], channels: Array<{ id: string; name: string }>): OnboardingChannelContext[] {
  const labels = new Map<string, string[]>();
  const addLabel = (id: string | null, label: string) => {
    if (!id) return;
    labels.set(id, [...(labels.get(id) ?? []), label]);
  };
  addLabel(settingsValue(settings, "welcomeChannelId"), "welcome channel");
  addLabel(settingsValue(settings, "resourceChannelId"), "resource channel");
  addLabel(settingsValue(settings, "questionChannelId"), "question channel");
  addLabel(settingsValue(settings, "supportChannelId"), "support channel");
  addLabel(settingsValue(settings, "builderChannelId"), "builder channel");
  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    label: labels.get(channel.id)?.join(" / ") ?? "selected community channel",
  }));
}

export async function loadDiscordOnboardingContext(creatorId: string): Promise<{ data: DiscordOnboardingContext | null; error: string | null }> {
  const connection = await getDiscordConnection(creatorId);
  if (connection.error) return { data: null, error: connection.error };
  if (!connection.data) return { data: null, error: "Connect Discord before configuring community onboarding." };
  const creator = await getCreatorWorkspace();
  if (creator.error || !creator.data) return { data: null, error: creator.error ?? "The creator workspace is not available." };
  const settingsResult = await getDiscordOnboardingSettings(creatorId);
  if (settingsResult.error) return { data: null, error: settingsResult.error };
  const channelsResult = await listDiscordConnectionChannels(creatorId);
  if (channelsResult.error) return { data: null, error: channelsResult.error };
  const selectedChannels = channelsResult.data.filter((channel) => channel.selected);
  const settings: DiscordOnboardingSettingsInput = onboardingSettingsInput(
    settingsResult.data,
    selectedChannels.map((channel) => channel.id),
  );
  return {
    data: {
      creatorId,
      connectionId: connection.data.id,
      guildId: connection.data.guild_id,
      communityName: connection.data.guild_name,
      creatorVoice: normalizeCreatorVoice(creator.data.voice_preference),
      settings,
      channels: labeledChannels(settings, selectedChannels),
    },
    error: null,
  };
}

function priorMemoryText(memory: Awaited<ReturnType<typeof getDiscordMemberMemory>>["data"]): string {
  const interactions = memory.interactions.slice(0, 8).map((interaction) => `${interaction.interaction_type}: ${interaction.text}`);
  const receipts = memory.receipts.slice(0, 4).map((receipt) => `onboarding ${receipt.status}: ${receipt.generated_message || receipt.reason}`);
  return [...interactions, ...receipts].join("\n").slice(0, 5_000);
}

async function createSkippedReceipt(
  context: DiscordOnboardingContext,
  input: { userId: string; username: string; triggerType: OnboardingTriggerType; sourceMessageId: string | null },
  reason: string,
): Promise<DiscordOnboardingReceipt | null> {
  const channelId = targetChannelId(context.settings, input.triggerType, context.channels);
  if (!channelId) return null;
  const channel = context.channels.find((candidate) => candidate.id === channelId);
  const result = await createDiscordOnboardingReceipt({
    creator_id: context.creatorId,
    discord_connection_id: context.connectionId,
    guild_id: context.guildId,
    channel_id: channelId,
    discord_user_id: input.userId,
    discord_username: input.username,
    trigger_type: input.triggerType,
    source_message_id: input.sourceMessageId,
    mind_conversation_id: null,
    generated_message: "",
    sent_message_id: null,
    status: "skipped",
    reason: `${reason}${channel ? ` Target: #${channel.name}.` : ""}`,
  });
  return result.data;
}

async function runForMember(
  creatorId: string,
  context: DiscordOnboardingContext,
  input: { userId: string; username: string; triggerType: OnboardingTriggerType; sourceMessageId: string | null; sourceMessageText: string | null; origin?: "live_listener" },
): Promise<{ receipt: DiscordOnboardingReceipt | null; duplicate: boolean }> {
  const duplicateResult = await findRecentDiscordOnboardingReceipt({
    creatorId,
    connectionId: context.connectionId,
    discordUserId: input.userId,
    triggerType: input.triggerType,
    sourceMessageId: input.sourceMessageId,
  });
  if (duplicateResult.error) throw new Error(duplicateResult.error);
  if (duplicateResult.data) return { receipt: duplicateResult.data, duplicate: true };

  const enabled = context.settings.enabled;
  if (!enabled && input.triggerType !== "manual_test") {
    return {
      receipt: await createSkippedReceipt(context, input, "Onboarding is disabled; no message was generated."),
      duplicate: false,
    };
  }

  const channelId = targetChannelId(context.settings, input.triggerType, context.channels);
  const channel = context.channels.find((candidate) => candidate.id === channelId);
  if (!channel) throw new Error("Choose at least one saved Discord channel before running onboarding.");
  const memory = await getDiscordMemberMemory(creatorId, input.userId);
  if (memory.error) throw new Error(memory.error);
  let generation;
  try {
    generation = await generateDiscordOnboardingMessage({
      communityName: context.communityName,
      creatorVoice: context.creatorVoice,
      channels: context.channels,
      beginnerGuideText: context.settings.beginnerGuideText,
      userHandle: input.username,
      triggerType: input.triggerType,
      priorMemory: priorMemoryText(memory.data),
      sourceMessageText: input.sourceMessageText,
    });
  } catch (error) {
    const reason = safeMessageError(error);
    const failed = await createDiscordOnboardingReceipt({
      creator_id: creatorId,
      discord_connection_id: context.connectionId,
      guild_id: context.guildId,
      channel_id: channel.id,
      discord_user_id: input.userId,
      discord_username: input.username,
      trigger_type: input.triggerType,
      source_message_id: input.sourceMessageId,
      mind_conversation_id: null,
      generated_message: "",
      sent_message_id: null,
      status: "failed",
      reason: listenerReason(input.origin, reason),
    });
    if (failed.error || !failed.data) throw new Error(failed.error ?? reason);
    return { receipt: failed.data, duplicate: false };
  }
  const shouldSend = enabled && canAutoSendOnboarding(context.settings.sendMode, input.triggerType);
  const receiptResult = await createDiscordOnboardingReceipt({
    creator_id: creatorId,
    discord_connection_id: context.connectionId,
    guild_id: context.guildId,
    channel_id: channel.id,
    discord_user_id: input.userId,
    discord_username: input.username,
    trigger_type: input.triggerType,
    source_message_id: input.sourceMessageId,
    mind_conversation_id: generation.conversationId,
    generated_message: generation.message,
    sent_message_id: null,
    status: "drafted",
    reason: listenerReason(input.origin, shouldSend ? "Generated and reserved for a configured onboarding send." : `Generated for creator review; send mode is ${context.settings.sendMode}.`),
  });
  if (receiptResult.error || !receiptResult.data) throw new Error(receiptResult.error ?? "The onboarding receipt could not be saved.");
  const receipt = receiptResult.data;
  const memoryResult = await recordOnboardingMemory({
    creatorId,
    connectionId: context.connectionId,
    guildId: context.guildId,
    channelId: channel.id,
    channelName: channel.name,
    discordUserId: input.userId,
    discordUsername: input.username,
    receiptId: receipt.id,
    generatedMessage: generation.message,
    status: "drafted",
    sentMessageId: null,
  });
  if (memoryResult.error || !memoryResult.data) {
    await updateDiscordOnboardingReceipt(receipt.id, {
      status: "failed",
      reason: listenerReason(input.origin, memoryResult.error ?? "Onboarding memory could not be saved."),
    });
    throw new Error(memoryResult.error ?? "Onboarding memory could not be saved.");
  }
  if (!shouldSend) return { receipt, duplicate: false };

  try {
    const client = createDiscordApiClient({ botToken: readDiscordBotToken(), guildId: context.guildId, monitoredChannelIds: [channel.id] });
    const sent = await client.sendMessage(channel.id, generation.message);
    const sentResult = await updateDiscordOnboardingReceipt(receipt.id, {
      sent_message_id: sent.id,
      status: "sent",
      reason: listenerReason(input.origin, `Sent by configured ${context.settings.sendMode} onboarding rule.`),
    });
    if (sentResult.error || !sentResult.data) throw new Error(sentResult.error ?? "The sent onboarding proof could not be saved.");
    await updateOnboardingMemoryStatus(memoryResult.data.interactionId, "sent", sent.id);
    return { receipt: sentResult.data, duplicate: false };
  } catch (error) {
    const reason = safeMessageError(error);
    const failed = await updateDiscordOnboardingReceipt(receipt.id, { status: "failed", reason: listenerReason(input.origin, reason) });
    await updateOnboardingMemoryStatus(memoryResult.data.interactionId, "failed", null);
    if (failed.error || !failed.data) throw new Error(reason);
    return { receipt: failed.data, duplicate: false };
  }
}

export async function processDiscordOnboardingMessage(
  creatorId: string,
  input: {
    userId: string;
    username: string;
    sourceChannelId: string;
    sourceMessageId: string;
    sourceMessageText: string;
  },
): Promise<DiscordOnboardingMessageResult> {
  const contextResult = await loadDiscordOnboardingContext(creatorId);
  if (contextResult.error || !contextResult.data) {
    return { receipt: null, duplicate: false, ignored: false, error: contextResult.error ?? "Discord onboarding context is unavailable." };
  }
  const context = contextResult.data;
  if (!context.channels.some((channel) => channel.id === input.sourceChannelId)) {
    return { receipt: null, duplicate: false, ignored: true, error: null };
  }
  if (!context.settings.enabled) {
    return { receipt: null, duplicate: false, ignored: true, error: null };
  }
  if (!isClearGuideRequest(input.sourceMessageText)) {
    return { receipt: null, duplicate: false, ignored: true, error: null };
  }

  try {
    const outcome = await runForMember(creatorId, context, {
      userId: input.userId,
      username: cleanHandle(input.username),
      triggerType: "guide_request",
      sourceMessageId: input.sourceMessageId,
      sourceMessageText: input.sourceMessageText,
      origin: "live_listener",
    });
    return { receipt: outcome.receipt, duplicate: outcome.duplicate, ignored: false, error: null };
  } catch (error) {
    return { receipt: null, duplicate: false, ignored: false, error: safeMessageError(error) };
  }
}

export async function processDiscordOnboarding(creatorId: string): Promise<{ data: DiscordOnboardingProcessResult; error: string | null }> {
  const result = emptyResult();
  const contextResult = await loadDiscordOnboardingContext(creatorId);
  if (contextResult.error || !contextResult.data) return { data: result, error: contextResult.error };
  const context = contextResult.data;
  if (!context.settings.enabled) return { data: result, error: null };
  const interactions = await listRecentDiscordInteractions(creatorId, context.channels.map((channel) => channel.id));
  if (interactions.error) return { data: result, error: interactions.error };
  result.inspected = interactions.data.length;
  for (const { interaction, member } of interactions.data) {
    if (interaction.interaction_type !== "comment" || !member?.platform_user_id || !isClearGuideRequest(interaction.text)) continue;
    result.guideRequestsDetected += 1;
    try {
      const outcome = await runForMember(creatorId, context, {
        userId: member.platform_user_id,
        username: member.display_name,
        triggerType: "guide_request",
        sourceMessageId: interaction.external_id,
        sourceMessageText: interaction.text,
      });
      if (!outcome.duplicate && outcome.receipt) {
        result.receiptsCreated += 1;
        result.receipts.unshift(outcome.receipt);
        result[outcome.receipt.status === "sent" ? "sent" : outcome.receipt.status === "drafted" ? "drafted" : outcome.receipt.status === "failed" ? "failed" : "skipped"] += 1;
      }
    } catch {
      result.failed += 1;
    }
  }
  return { data: result, error: null };
}

export async function runManualDiscordOnboardingTest(
  creatorId: string,
  input: { username: string; triggerType: "manual_test" | "member_join" },
): Promise<{ data: DiscordOnboardingReceipt | null; error: string | null }> {
  const contextResult = await loadDiscordOnboardingContext(creatorId);
  if (contextResult.error || !contextResult.data) return { data: null, error: contextResult.error };
  try {
    const username = cleanHandle(input.username);
    const outcome = await runForMember(creatorId, contextResult.data, {
      userId: safeUserIdForManualTest(username),
      username,
      triggerType: input.triggerType,
      sourceMessageId: null,
      sourceMessageText: null,
    });
    return { data: outcome.receipt, error: null };
  } catch (error) {
    return { data: null, error: safeMessageError(error) };
  }
}
