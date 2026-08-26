import { BUILDER_API_KEY_ENV } from "@/lib/minds/config";
import { toMindsErrorInfo } from "@/lib/minds/errors";
import { generateDiscordOnboardingMessage } from "@/lib/minds/onboarding";
import { normalizeCreatorVoice, type CreatorVoice } from "@/types/data";
import { canAutoSendOnboarding, matchClearGuideRequest, type OnboardingChannelContext } from "@/lib/discord/onboarding";
import type { DiscordOnboardingPromptInput } from "@/lib/discord/onboarding";
import { createDiscordApiClient } from "@/lib/discord/client";
import type { DiscordMessage } from "@/lib/discord/client";
import { DiscordIntegrationError, isNetworkFailure, toDiscordIntegrationError } from "@/lib/discord/errors";
import type { OnboardingTriggerType } from "@/lib/discord/onboarding-types";
import type {
  LiveOnboardingRunResult,
  LiveGuideRequestInput,
} from "@/lib/discord/live-listener";
import {
  createDiscordOnboardingReceipt,
  findRecentDiscordOnboardingReceipt,
  getDevelopmentCreator,
  getDiscordConnection,
  getDiscordMemberMemory,
  getDiscordOnboardingSettings,
  listDiscordConnectionChannels,
  onboardingSettingsInput,
  recordOnboardingMemory,
  type DiscordListenerStorage,
  type DiscordOnboardingReceipt,
  type DiscordOnboardingSettingsInput,
  updateDiscordOnboardingReceipt,
  updateOnboardingMemoryStatus,
} from "@/lib/discord/listener-storage";
import type { DiscordOnboardingGeneration } from "@/lib/minds/onboarding";

export interface DiscordListenerOnboardingContext {
  creatorId: string;
  connectionId: string;
  guildId: string;
  communityName: string;
  creatorVoice: CreatorVoice;
  settings: DiscordOnboardingSettingsInput;
  settingsRowId: string | null;
  monitoredChannelIds: string[];
  channels: OnboardingChannelContext[];
}

const inFlightSourceMessageIds = new Set<string>();

export interface DiscordListenerOnboardingDependencies {
  findRecentReceipt: typeof findRecentDiscordOnboardingReceipt;
  getMemberMemory: typeof getDiscordMemberMemory;
  generateMessage: (input: DiscordOnboardingPromptInput) => Promise<DiscordOnboardingGeneration>;
  createReceipt: typeof createDiscordOnboardingReceipt;
  recordMemory: typeof recordOnboardingMemory;
  updateReceipt: typeof updateDiscordOnboardingReceipt;
  updateMemoryStatus: typeof updateOnboardingMemoryStatus;
  sendMessage: (botToken: string, guildId: string, channelId: string, content: string) => Promise<Pick<DiscordMessage, "id">>;
}

const defaultDependencies: DiscordListenerOnboardingDependencies = {
  findRecentReceipt: findRecentDiscordOnboardingReceipt,
  getMemberMemory: getDiscordMemberMemory,
  generateMessage: generateDiscordOnboardingMessage,
  createReceipt: createDiscordOnboardingReceipt,
  recordMemory: recordOnboardingMemory,
  updateReceipt: updateDiscordOnboardingReceipt,
  updateMemoryStatus: updateOnboardingMemoryStatus,
  sendMessage: async (botToken, guildId, channelId, content) => {
    const client = createDiscordApiClient({ botToken, guildId, monitoredChannelIds: [channelId] });
    return client.sendMessage(channelId, content);
  },
};

function cleanHandle(value: string): string {
  return value.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 100) || "New member";
}

function safeMessageError(error: unknown): string {
  if (isNetworkFailure(error)) return "network_fetch_failed";
  const discordError = toDiscordIntegrationError(error);
  if (discordError.code !== "API" || error instanceof DiscordIntegrationError) return discordError.message;
  return toMindsErrorInfo(error, process.env[BUILDER_API_KEY_ENV]).message;
}

function listenerReason(reason: string): string {
  return `Live Discord listener: ${reason}`;
}

type ListenerFailureCategory = "mind_generation_failed" | "discord_send_failed" | "network_fetch_failed";

type SendDestinationReason = "source_question_channel" | "welcome_channel" | "configured_guide_channel" | "default_readable_channel";

interface SendDestination {
  channelId: string;
  reason: SendDestinationReason;
}

function failureCategory(step: "mind_generation_failed" | "discord_send_failed", error: unknown): ListenerFailureCategory {
  return isNetworkFailure(error) ? "network_fetch_failed" : step;
}

function settingsValue(
  settings: DiscordOnboardingSettingsInput,
  key: keyof Pick<DiscordOnboardingSettingsInput, "welcomeChannelId" | "resourceChannelId" | "questionChannelId" | "supportChannelId" | "builderChannelId">,
): string | null {
  const value = settings[key];
  return typeof value === "string" && value ? value : null;
}

function targetChannel(
  settings: DiscordOnboardingSettingsInput,
  triggerType: OnboardingTriggerType,
  channels: OnboardingChannelContext[],
  fallbackChannelId: string | null,
  sourceChannelId: string | null,
): SendDestination | null {
  if (triggerType === "guide_request" && sourceChannelId && channels.some((channel) => channel.id === sourceChannelId)) {
    return { channelId: sourceChannelId, reason: "source_question_channel" };
  }

  const configured = triggerType === "member_join"
    ? [settingsValue(settings, "welcomeChannelId")]
    : triggerType === "first_message"
    ? [settingsValue(settings, "resourceChannelId"), settingsValue(settings, "welcomeChannelId"), settingsValue(settings, "questionChannelId")]
    : [settingsValue(settings, "welcomeChannelId"), settingsValue(settings, "resourceChannelId")];
  const channelId = [...configured, fallbackChannelId, channels[0]?.id ?? null]
    .find((id): id is string => Boolean(id && channels.some((channel) => channel.id === id)));
  if (!channelId) return null;
  return {
    channelId,
    reason: triggerType === "member_join"
      ? "welcome_channel"
      : configured.includes(channelId) ? "configured_guide_channel" : "default_readable_channel",
  };
}

function labeledChannels(
  settings: DiscordOnboardingSettingsInput,
  channels: Array<{ id: string; name: string }>,
  monitoredChannelIds: readonly string[],
): OnboardingChannelContext[] {
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
    label: labels.get(channel.id)?.join(" / ") ?? (monitoredChannelIds.includes(channel.id) ? "selected community channel" : "readable community channel"),
  }));
}

export async function loadDiscordListenerOnboardingContext(
  storage: DiscordListenerStorage,
  creatorId: string,
): Promise<DiscordListenerOnboardingContext> {
  const connection = await getDiscordConnection(storage, creatorId);
  if (!connection) throw new Error("Connect Discord before configuring community onboarding.");
  const creator = await getDevelopmentCreator(storage);
  const channels = await listDiscordConnectionChannels(connection);
  const selectedChannels = channels.filter((channel) => channel.selected);
  const readableChannels = channels.filter((channel) => channel.canRead);
  const settingsRow = await getDiscordOnboardingSettings(storage, creatorId, connection.id);
  const settings = onboardingSettingsInput(
    settingsRow,
    readableChannels.map((channel) => channel.id),
  );
  return {
    creatorId,
    connectionId: connection.id,
    guildId: connection.guild_id,
    communityName: connection.guild_name,
    creatorVoice: normalizeCreatorVoice(creator.voice_preference),
    settings,
    settingsRowId: settingsRow?.id ?? null,
    monitoredChannelIds: selectedChannels.map((channel) => channel.id),
    channels: labeledChannels(settings, readableChannels, selectedChannels.map((channel) => channel.id)),
  };
}

function priorMemoryText(memory: Awaited<ReturnType<typeof getDiscordMemberMemory>>): string {
  const interactions = memory.interactions.slice(0, 8).map((interaction) => `${interaction.interaction_type}: ${interaction.text}`);
  const receipts = memory.receipts.slice(0, 4).map((receipt) => `onboarding ${receipt.status}: ${receipt.generated_message || receipt.reason}`);
  return [...interactions, ...receipts].join("\n").slice(0, 5_000);
}

async function createSkippedReceipt(
  storage: DiscordListenerStorage,
  context: DiscordListenerOnboardingContext,
  input: { userId: string; username: string; triggerType: OnboardingTriggerType; sourceMessageId: string | null; sourceChannelId: string | null },
  reason: string,
  dependencies: DiscordListenerOnboardingDependencies,
): Promise<DiscordOnboardingReceipt | null> {
  const destination = targetChannel(context.settings, input.triggerType, context.channels, context.monitoredChannelIds[0] ?? null, input.sourceChannelId);
  if (!destination) return null;
  const channel = context.channels.find((candidate) => candidate.id === destination.channelId);
  if (!channel) return null;
  return dependencies.createReceipt(storage, {
    creator_id: context.creatorId,
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
    status: "skipped",
    reason: `${reason} destination_reason=${destination.reason}; sent_channel_id=${channel.id}.${channel ? ` Target: #${channel.name}.` : ""}`,
  });
}

async function runForMember(
  storage: DiscordListenerStorage,
  botToken: string,
  context: DiscordListenerOnboardingContext,
  input: LiveGuideRequestInput & { triggerType: OnboardingTriggerType; triggerReason: string; origin?: "live_listener" },
  dependencies: DiscordListenerOnboardingDependencies,
): Promise<{ receipt: DiscordOnboardingReceipt | null; duplicate: boolean }> {
  const duplicate = await dependencies.findRecentReceipt(storage, {
    creatorId: context.creatorId,
    connectionId: context.connectionId,
    discordUserId: input.userId,
    triggerType: input.triggerType,
    sourceMessageId: input.sourceMessageId,
  });
  if (duplicate) return { receipt: duplicate, duplicate: true };

  if (!context.settings.enabled && input.triggerType !== "manual_test") {
    return {
      receipt: await createSkippedReceipt(storage, context, input, "Onboarding is disabled; no message was generated.", dependencies),
      duplicate: false,
    };
  }

  const destination = targetChannel(context.settings, input.triggerType, context.channels, context.monitoredChannelIds[0] ?? null, input.sourceChannelId);
  const channel = destination ? context.channels.find((candidate) => candidate.id === destination.channelId) : null;
  if (!destination || !channel) throw new Error("Choose at least one saved Discord channel before running onboarding.");
  console.log(`[discord listener] send destination reason=${destination.reason} channel_id=${channel.id} message=${input.sourceMessageId}`);
  const memory = await dependencies.getMemberMemory(storage, context.creatorId, input.userId);
  let generatedMessage: string;
  let mindConversationId: string | null = null;
  let generationFailureCategory: ListenerFailureCategory | null = null;
  try {
    const generation = await dependencies.generateMessage({
      communityName: context.communityName,
      creatorVoice: context.creatorVoice,
      channels: context.channels,
      beginnerGuideText: context.settings.beginnerGuideText,
      userHandle: cleanHandle(input.username),
      triggerType: input.triggerType,
      priorMemory: priorMemoryText(memory),
      sourceMessageText: input.sourceMessageText,
    });
    generatedMessage = generation.message;
    mindConversationId = generation.conversationId;
  } catch (error) {
    generationFailureCategory = failureCategory("mind_generation_failed", error);
    console.error(`[discord listener] mind_generation_failed category=${generationFailureCategory} message=${input.sourceMessageId}`);
    generatedMessage = context.settings.beginnerGuideText.trim();
    if (!generatedMessage) {
      const failed = await dependencies.createReceipt(storage, {
        creator_id: context.creatorId,
        discord_connection_id: context.connectionId,
        guild_id: context.guildId,
        channel_id: channel.id,
        discord_user_id: input.userId,
        discord_username: cleanHandle(input.username),
        trigger_type: input.triggerType,
        source_message_id: input.sourceMessageId,
        mind_conversation_id: null,
        generated_message: "",
        sent_message_id: null,
        status: "failed",
        reason: listenerReason(`mind_generation_failed; category=${generationFailureCategory}; trigger_reason=${input.triggerReason}; send_mode=${context.settings.sendMode}; intended_channel_id=${channel.id}; destination_reason=${destination.reason}`),
      });
      return { receipt: failed, duplicate: false };
    }
  }

  const shouldSend = context.settings.enabled && canAutoSendOnboarding(context.settings.sendMode, input.triggerType);
  const receipt = await dependencies.createReceipt(storage, {
    creator_id: context.creatorId,
    discord_connection_id: context.connectionId,
    guild_id: context.guildId,
    channel_id: channel.id,
    discord_user_id: input.userId,
    discord_username: cleanHandle(input.username),
    trigger_type: input.triggerType,
    source_message_id: input.sourceMessageId,
    mind_conversation_id: mindConversationId,
    generated_message: generatedMessage,
    sent_message_id: null,
    status: "drafted",
    reason: listenerReason(generationFailureCategory
      ? `Mind generation failed; used deterministic beginner guide fallback. category=${generationFailureCategory}; trigger_reason=${input.triggerReason}; send_mode=${context.settings.sendMode}; intended_channel_id=${channel.id}; destination_reason=${destination.reason}.`
      : shouldSend
        ? `Generated and reserved for a configured onboarding send. trigger_reason=${input.triggerReason}; send_mode=${context.settings.sendMode}; intended_channel_id=${channel.id}; destination_reason=${destination.reason}.`
        : `Generated for creator review; send mode is ${context.settings.sendMode}. trigger_reason=${input.triggerReason}; intended_channel_id=${channel.id}; destination_reason=${destination.reason}.`),
  });
  let memoryResult: { interactionId: string };
  try {
    memoryResult = await dependencies.recordMemory(storage, {
      creatorId: context.creatorId,
      connectionId: context.connectionId,
      guildId: context.guildId,
      channelId: channel.id,
      channelName: channel.name,
      discordUserId: input.userId,
      discordUsername: cleanHandle(input.username),
      receiptId: receipt.id,
      generatedMessage,
      status: "drafted",
      sentMessageId: null,
    });
  } catch (error) {
    const reason = safeMessageError(error);
    await dependencies.updateReceipt(storage, receipt.id, {
      status: "failed",
      reason: listenerReason(reason),
    });
    throw new Error(reason);
  }

  if (!shouldSend) return { receipt, duplicate: false };

  try {
    const sent = await dependencies.sendMessage(botToken, context.guildId, channel.id, generatedMessage);
    const sentReceipt = await dependencies.updateReceipt(storage, receipt.id, {
      sent_message_id: sent.id,
      status: "sent",
      reason: listenerReason(`Sent by configured ${context.settings.sendMode} onboarding rule. trigger_reason=${input.triggerReason}; send_mode=${context.settings.sendMode}; sent_channel_id=${channel.id}; destination_reason=${destination.reason}.`),
    });
    await dependencies.updateMemoryStatus(storage, memoryResult.interactionId, "sent", sent.id);
    console.log(`[discord listener] sent_channel_id=${channel.id} sent_message_id=${sent.id} message=${input.sourceMessageId}`);
    return { receipt: sentReceipt, duplicate: false };
  } catch (error) {
    const category = failureCategory("discord_send_failed", error);
    console.error(`[discord listener] discord_send_failed category=${category} message=${input.sourceMessageId} channel_id=${channel.id}`);
    const failed = await dependencies.updateReceipt(storage, receipt.id, {
      status: "failed",
      reason: listenerReason(`discord_send_failed; category=${category}; trigger_reason=${input.triggerReason}; send_mode=${context.settings.sendMode}; intended_channel_id=${channel.id}; destination_reason=${destination.reason}`),
    });
    await dependencies.updateMemoryStatus(storage, memoryResult.interactionId, "failed", null);
    return { receipt: failed, duplicate: false };
  }
}

export async function runDiscordListenerOnboardingAttempt(
  storage: DiscordListenerStorage,
  botToken: string,
  context: DiscordListenerOnboardingContext,
  input: LiveGuideRequestInput & { triggerType: OnboardingTriggerType; triggerReason: string; origin?: "live_listener" },
  dependencies: Partial<DiscordListenerOnboardingDependencies> = {},
): Promise<{ receipt: DiscordOnboardingReceipt | null; duplicate: boolean }> {
  return runForMember(storage, botToken, context, input, { ...defaultDependencies, ...dependencies });
}

export async function processDiscordListenerOnboardingMessage(
  storage: DiscordListenerStorage,
  botToken: string,
  creatorId: string,
  input: LiveGuideRequestInput,
): Promise<LiveOnboardingRunResult> {
  if (inFlightSourceMessageIds.has(input.sourceMessageId)) {
    return { receipt: null, duplicate: true, ignored: false, error: null };
  }
  inFlightSourceMessageIds.add(input.sourceMessageId);
  try {
    const context = await loadDiscordListenerOnboardingContext(storage, creatorId);
    const trigger = matchClearGuideRequest(input.sourceMessageText);
    console.log(`[discord listener] settings row_id=${context.settingsRowId ?? "none"} creator_id=${context.creatorId} connection_id=${context.connectionId} guild_id=${context.guildId} enabled=${context.settings.enabled} send_mode=${context.settings.sendMode} message channel id=${input.sourceChannelId} question_channel_id=${context.settings.questionChannelId ?? "null"} trigger matched=${trigger.matched} trigger reason=${trigger.reason}`);
    if (!context.monitoredChannelIds.includes(input.sourceChannelId)) {
      console.log("[discord listener] send decision: persisted_only reason=channel_not_monitored");
      return { receipt: null, duplicate: false, ignored: true, error: null };
    }
    if (!context.settings.enabled || !trigger.matched) {
      console.log(`[discord listener] send decision: persisted_only reason=${context.settings.enabled ? trigger.reason : "onboarding_disabled"}`);
      return { receipt: null, duplicate: false, ignored: true, error: null };
    }

    try {
      const outcome = await runDiscordListenerOnboardingAttempt(storage, botToken, context, {
        ...input,
        triggerType: "guide_request",
        triggerReason: trigger.reason,
        origin: "live_listener",
      });
      const sendDecision = outcome.duplicate
        ? "persisted_only"
        : outcome.receipt?.status === "sent"
          ? "sent"
          : outcome.receipt?.status === "drafted"
            ? "drafted"
            : outcome.receipt?.status === "failed"
              ? "failed"
              : "persisted_only";
      const reason = outcome.duplicate ? "duplicate_message" : outcome.receipt?.status === "failed" ? "onboarding_failed" : null;
      console.log(`[discord listener] send decision: ${sendDecision} message=${input.sourceMessageId}${reason ? ` reason=${reason}` : ""}${outcome.receipt ? ` receipt=${outcome.receipt.id}` : ""}`);
      return { receipt: outcome.receipt, duplicate: outcome.duplicate, ignored: false, error: null };
    } catch (error) {
      console.log(`[discord listener] send decision: failed message=${input.sourceMessageId}`);
      return { receipt: null, duplicate: false, ignored: false, error: safeMessageError(error) };
    }
  } catch (error) {
    return { receipt: null, duplicate: false, ignored: false, error: safeMessageError(error) };
  } finally {
    inFlightSourceMessageIds.delete(input.sourceMessageId);
  }
}
