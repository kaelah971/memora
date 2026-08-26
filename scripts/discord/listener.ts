import "../load-env";

import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  type Guild,
  type Message,
} from "discord.js";

import {
  createDiscordListenerStorage,
  getDevelopmentCreator,
  getDiscordConnection,
  getDiscordOnboardingSettings,
  onboardingSettingsInput,
  persistDiscordMessage,
  type DiscordListenerStorage,
} from "../../lib/discord/listener-storage";
import type { DiscordMessage } from "../../lib/discord/client";
import { readDiscordBotToken, type DiscordConfig } from "../../lib/discord/config";
import { isNetworkFailure } from "../../lib/discord/errors";
import type { OnboardingSendMode } from "../../lib/discord/onboarding-types";
import { processDiscordListenerOnboardingMessage } from "../../lib/discord/listener-onboarding";
import {
  handleLiveDiscordMessage,
  type LiveDiscordListenerContext,
  type LiveDiscordMessage,
} from "../../lib/discord/live-listener";

interface ListenerRuntime {
  creatorId: string;
  connectionId: string;
  botToken: string;
  guildId: string;
  guildName: string;
  selectedChannelIds: string[];
  storage: DiscordListenerStorage;
  onboardingSettingsRowId: string | null;
  onboardingEnabled: boolean;
  onboardingSendMode: OnboardingSendMode;
  onboardingQuestionChannelId: string | null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Discord listener error.";
}

function gatewayErrorCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = error.code;
  return typeof code === "number" ? code : null;
}

function isMessageContentIntentError(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  return gatewayErrorCode(error) === 4014 || message.includes("disallowed intents") || message.includes("message content intent");
}

function gatewayFailureCategory(error: unknown): "discord_gateway_unavailable" | "network_fetch_failed" | "discord_gateway_error" {
  const message = errorText(error).toLowerCase();
  if (message.includes("enotfound") || message.includes("getaddrinfo") || message.includes("gateway-")) return "discord_gateway_unavailable";
  if (isNetworkFailure(error)) return "network_fetch_failed";
  return "discord_gateway_error";
}

function reportGatewayError(prefix: string, error: unknown): void {
  if (isMessageContentIntentError(error)) {
    console.error("Enable Message Content Intent in Discord Developer Portal for this bot.");
  }
  console.error(`${prefix}: ${gatewayFailureCategory(error)}`);
}

async function loadRuntime(): Promise<ListenerRuntime> {
  const storage = createDiscordListenerStorage();
  const creator = await getDevelopmentCreator(storage);
  const connection = await getDiscordConnection(storage, creator.id);
  if (!connection) throw new Error("Connect Discord before starting the live listener.");
  const selectedChannelIds = [...new Set(connection.selected_channel_ids)];
  if (selectedChannelIds.length === 0) throw new Error("Select and save at least one Discord channel before starting the live listener.");
  const onboardingRow = await getDiscordOnboardingSettings(storage, creator.id, connection.id);
  const onboardingSettings = onboardingSettingsInput(onboardingRow);
  console.log(`[discord listener] settings row_id=${onboardingRow?.id ?? "none"} creator_id=${creator.id} connection_id=${connection.id} guild_id=${connection.guild_id} enabled=${onboardingSettings.enabled} send_mode=${onboardingSettings.sendMode} question_channel_id=${onboardingSettings.questionChannelId ?? "null"}`);
  return {
    creatorId: creator.id,
    connectionId: connection.id,
    botToken: readDiscordBotToken(),
    guildId: connection.guild_id,
    guildName: connection.guild_name,
    selectedChannelIds,
    storage,
    onboardingSettingsRowId: onboardingRow?.id ?? null,
    onboardingEnabled: onboardingSettings.enabled,
    onboardingSendMode: onboardingSettings.sendMode,
    onboardingQuestionChannelId: onboardingSettings.questionChannelId,
  };
}

async function verifyPermissions(guild: Guild, channelIds: readonly string[]): Promise<void> {
  const member = await guild.members.fetchMe();
  const required = [
    [PermissionFlagsBits.ViewChannel, "View Channels"],
    [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
    [PermissionFlagsBits.SendMessages, "Send Messages"],
  ] as const;
  for (const channelId of channelIds) {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || !("permissionsFor" in channel)) {
      throw new Error(`Saved Discord channel ${channelId} is not a readable text channel.`);
    }
    const permissions = channel.permissionsFor(member);
    const missing = required.filter(([permission]) => !permissions?.has(permission)).map(([, label]) => label);
    if (missing.length > 0) {
      throw new Error(`Bot is missing ${missing.join(", ")} in #${"name" in channel && typeof channel.name === "string" ? channel.name : channelId}.`);
    }
  }
}

function toLiveDiscordMessage(message: Message): LiveDiscordMessage {
  const channel = message.channel;
  return {
    id: message.id,
    guildId: message.guildId,
    channel: {
      id: message.channelId,
      guild_id: message.guildId ?? undefined,
      name: "name" in channel && typeof channel.name === "string" ? channel.name : message.channelId,
      type: typeof channel.type === "number" ? channel.type : 0,
    },
    content: message.content,
    timestamp: message.createdAt.toISOString(),
    author: {
      id: message.author.id,
      username: message.author.username,
      global_name: message.author.globalName,
      bot: message.author.bot,
      avatar: message.author.avatar,
    },
  };
}

function toDiscordMessage(message: LiveDiscordMessage): DiscordMessage {
  return {
    id: message.id,
    channel_id: message.channel.id,
    content: message.content,
    timestamp: message.timestamp,
    author: message.author,
  };
}

async function logReady(client: Client, runtime: ListenerRuntime): Promise<void> {
  const guild = await client.guilds.fetch(runtime.guildId);
  if (!guild || guild.id !== runtime.guildId) throw new Error("The saved Discord guild could not be verified for the live listener.");
  await verifyPermissions(guild, runtime.selectedChannelIds);
  console.log("Memora Discord listener ready");
  console.log(`guild: ${guild.name} (${guild.id})`);
  console.log(`watched channel ids: ${runtime.selectedChannelIds.join(", ")}`);
}

async function main(): Promise<void> {
  const runtime = await loadRuntime();
  const discordConfig: DiscordConfig = {
    botToken: runtime.botToken,
    guildId: runtime.guildId,
    monitoredChannelIds: runtime.selectedChannelIds,
  };
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  let readyForMessages = false;
  const context = (): LiveDiscordListenerContext => ({
    guildId: runtime.guildId,
    selectedChannelIds: runtime.selectedChannelIds,
    botUserId: client.user?.id ?? null,
    onboardingEnabled: runtime.onboardingEnabled,
    onboardingSendMode: runtime.onboardingSendMode,
    onboardingQuestionChannelId: runtime.onboardingQuestionChannelId,
  });

  client.once(Events.ClientReady, (readyClient) => {
    void logReady(readyClient, runtime)
      .then(() => {
        readyForMessages = true;
      })
      .catch((error) => {
        reportGatewayError("Discord listener stopped", error);
        client.destroy();
        process.exitCode = 1;
      });
  });
  client.on(Events.MessageCreate, (message) => {
    if (!readyForMessages) return;
    const liveMessage = toLiveDiscordMessage(message);
    void handleLiveDiscordMessage(liveMessage, context(), {
      persistMessage: async (event, options) => {
        await persistDiscordMessage(runtime.storage, runtime.creatorId, discordConfig, runtime.guildName, event.channel, toDiscordMessage(event), options);
      },
      logDecision: (decision) => {
        if (decision.classification === "guide_request") return;
        console.log(`[discord listener] settings row_id=${runtime.onboardingSettingsRowId ?? "none"} creator_id=${runtime.creatorId} connection_id=${runtime.connectionId} guild_id=${runtime.guildId} enabled=${runtime.onboardingEnabled} send_mode=${runtime.onboardingSendMode} message channel id=${decision.messageChannelId} question_channel_id=${decision.questionChannelId ?? "null"} trigger matched=${decision.triggerMatched} trigger reason=${decision.triggerReason}`);
        if (decision.classification === "persist_only") console.log(`[discord listener] send decision: persisted_only reason=${decision.triggerMatched ? "channel_not_selected" : "trigger_not_matched"}`);
      },
      runGuideRequest: (input) => processDiscordListenerOnboardingMessage(runtime.storage, runtime.botToken, runtime.creatorId, input),
    }).then((result) => {
      const receipt = result.receipt ? ` receipt=${result.receipt.id}` : "";
      const sentMessage = result.receipt?.sent_message_id ? ` sent_message_id=${result.receipt.sent_message_id}` : "";
      const sentChannel = result.receipt?.status === "sent" ? ` sent_channel_id=${result.receipt.channel_id}` : "";
      console.log(`Discord listener ${result.outcome}: message=${liveMessage.id}${receipt}${sentMessage}${sentChannel}${result.error ? ` error=${result.error}` : ""}`);
    }).catch((error) => {
      reportGatewayError(`Discord listener failed for message ${liveMessage.id}`, error);
    });
  });
  client.on(Events.Error, (error) => reportGatewayError("Discord client error", error));
  client.on(Events.ShardError, (error) => reportGatewayError("Discord shard error", error));
  await client.login(runtime.botToken);
}

void main().catch((error) => {
  reportGatewayError("Discord listener could not start", error);
  process.exitCode = 1;
});
