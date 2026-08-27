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
  listDiscordListenerWorkspaces,
  onboardingSettingsInput,
  persistDiscordMessage,
  type DiscordListenerStorage,
} from "../../lib/discord/listener-storage";
import type { DiscordMessage } from "../../lib/discord/client";
import { readDiscordBotToken, type DiscordConfig } from "../../lib/discord/config";
import { isNetworkFailure } from "../../lib/discord/errors";
import { matchClearGuideRequest } from "../../lib/discord/onboarding";
import type { OnboardingSendMode } from "../../lib/discord/onboarding-types";
import { processDiscordListenerOnboardingMessage } from "../../lib/discord/listener-onboarding";
import {
  handleLiveDiscordMessage,
  type LiveDiscordListenerContext,
  type LiveDiscordMessage,
} from "../../lib/discord/live-listener";

interface ListenerRuntime {
  workspaceId: string;
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

async function loadRuntimes(storage: DiscordListenerStorage, botToken: string): Promise<ListenerRuntime[]> {
  const workspaces = await listDiscordListenerWorkspaces(storage);
  return workspaces.map(({ workspaceId, creator, connection, onboardingSettings: onboardingRow }) => {
    const selectedChannelIds = [...new Set(connection.selected_channel_ids)];
    const onboardingSettings = onboardingSettingsInput(onboardingRow, selectedChannelIds);
    console.log(`[discord listener] workspace_id=${workspaceId} creator_id=${creator.id} connection_id=${connection.id} guild_id=${connection.guild_id} enabled=${onboardingSettings.enabled} send_mode=${onboardingSettings.sendMode} selected_channel_count=${selectedChannelIds.length}`);
    return {
      workspaceId,
      creatorId: creator.id,
      connectionId: connection.id,
      botToken,
      guildId: connection.guild_id,
      guildName: connection.guild_name,
      selectedChannelIds,
      storage,
      onboardingSettingsRowId: onboardingRow?.id ?? null,
      onboardingEnabled: onboardingSettings.enabled,
      onboardingSendMode: onboardingSettings.sendMode,
      onboardingQuestionChannelId: onboardingSettings.questionChannelId,
    };
  });
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

async function verifyRuntime(client: Client, runtime: ListenerRuntime): Promise<boolean> {
  try {
    const guild = await client.guilds.fetch(runtime.guildId);
    if (!guild || guild.id !== runtime.guildId) throw new Error("The saved Discord guild could not be verified for the live listener.");
    if (runtime.selectedChannelIds.length > 0) await verifyPermissions(guild, runtime.selectedChannelIds);
    console.log(`[discord listener] workspace_id=${runtime.workspaceId} guild_id=${guild.id} guild_name=${guild.name} selected_channel_count=${runtime.selectedChannelIds.length} permissions=verified`);
    return true;
  } catch (error) {
    reportGatewayError(`[discord listener] workspace_id=${runtime.workspaceId} guild_id=${runtime.guildId} verification failed`, error);
    return false;
  }
}

async function verifyRuntimes(client: Client, runtimes: ListenerRuntime[]): Promise<ListenerRuntime[]> {
  const verified: ListenerRuntime[] = [];
  for (const runtime of runtimes) {
    if (await verifyRuntime(client, runtime)) verified.push(runtime);
  }
  return verified;
}

function sendDecision(outcome: string): "sent" | "failed" | "skipped" {
  if (outcome === "sent") return "sent";
  if (outcome === "failed") return "failed";
  return "skipped";
}

async function main(): Promise<void> {
  console.log("[discord listener] Discord listener booting");
  const storage = createDiscordListenerStorage();
  console.log("[discord listener] Supabase connected");
  const botToken = readDiscordBotToken();
  let runtimes = await loadRuntimes(storage, botToken);
  console.log(`[discord listener] Loaded connected guild count=${runtimes.length}`);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  let readyForMessages = false;
  let refreshing = false;

  async function refreshRuntimes(): Promise<void> {
    if (refreshing) return;
    refreshing = true;
    try {
      const loaded = await loadRuntimes(storage, botToken);
      runtimes = await verifyRuntimes(client, loaded);
      console.log(`[discord listener] configuration refreshed connected guild count=${runtimes.length}`);
    } catch (error) {
      reportGatewayError("[discord listener] configuration refresh failed", error);
    } finally {
      refreshing = false;
    }
  }

  client.once(Events.ClientReady, (readyClient) => {
    void verifyRuntimes(readyClient, runtimes).then((verifiedRuntimes) => {
      runtimes = verifiedRuntimes;
      readyForMessages = true;
      console.log("[discord listener] Discord client ready");
      console.log("[discord listener] Listening for workspace-scoped onboarding messages");
      const refreshTimer = setInterval(() => void refreshRuntimes(), 60_000);
      refreshTimer.unref();
    }).catch((error) => {
      reportGatewayError("Discord listener stopped", error);
      client.destroy();
      process.exitCode = 1;
    });
  });
  client.on(Events.MessageCreate, (message) => {
    if (!readyForMessages) return;
    const liveMessage = toLiveDiscordMessage(message);
    const trigger = matchClearGuideRequest(liveMessage.content);
    const matchingRuntimes = runtimes.filter((runtime) => runtime.guildId === liveMessage.guildId);
    const runtime = matchingRuntimes.length === 1 ? matchingRuntimes[0] : null;
    const workspaceMatched = matchingRuntimes.length === 1;
    const workspaceLabel = matchingRuntimes.length > 1 ? "ambiguous" : runtime?.workspaceId ?? "none";
    console.log(`[discord listener] message guild_id=${liveMessage.guildId ?? "null"} channel_id=${liveMessage.channel.id} workspace_matched=${workspaceMatched} workspace_id=${workspaceLabel} onboarding_enabled=${runtime?.onboardingEnabled ?? false} trigger_matched=${trigger.matched}`);
    if (!runtime) {
      console.log(`[discord listener] message_result guild_id=${liveMessage.guildId ?? "null"} channel_id=${liveMessage.channel.id} workspace_matched=false workspace_id=${workspaceLabel} onboarding_enabled=false trigger_matched=${trigger.matched} send_decision=skipped reason=${matchingRuntimes.length > 1 ? "ambiguous_guild_workspace" : "workspace_not_matched"}`);
      return;
    }

    const discordConfig: DiscordConfig = {
      botToken: runtime.botToken,
      guildId: runtime.guildId,
      monitoredChannelIds: runtime.selectedChannelIds,
    };
    const context = (): LiveDiscordListenerContext => ({
      guildId: runtime.guildId,
      selectedChannelIds: runtime.selectedChannelIds,
      botUserId: client.user?.id ?? null,
      onboardingEnabled: runtime.onboardingEnabled,
      onboardingSendMode: runtime.onboardingSendMode,
      onboardingQuestionChannelId: runtime.onboardingQuestionChannelId,
    });

    void handleLiveDiscordMessage(liveMessage, context(), {
      persistMessage: async (event, options) => {
        await persistDiscordMessage(runtime.storage, runtime.creatorId, discordConfig, runtime.guildName, event.channel, toDiscordMessage(event), options, runtime.workspaceId);
      },
      logDecision: (decision) => {
        console.log(`[discord listener] message guild_id=${runtime.guildId} channel_id=${decision.messageChannelId} workspace_matched=true workspace_id=${runtime.workspaceId} onboarding_enabled=${decision.settingsEnabled ?? runtime.onboardingEnabled} trigger_matched=${decision.triggerMatched} trigger_reason=${decision.triggerReason} classification=${decision.classification}`);
      },
      runGuideRequest: (input) => processDiscordListenerOnboardingMessage(runtime.storage, runtime.botToken, runtime.creatorId, input, runtime.workspaceId),
    }).then((result) => {
      const receipt = result.receipt ? ` receipt=${result.receipt.id}` : "";
      const sentMessage = result.receipt?.sent_message_id ? ` sent_message_id=${result.receipt.sent_message_id}` : "";
      const sentChannel = result.receipt?.status === "sent" ? ` sent_channel_id=${result.receipt.channel_id}` : "";
      console.log(`[discord listener] message_result guild_id=${runtime.guildId} channel_id=${liveMessage.channel.id} workspace_matched=true workspace_id=${runtime.workspaceId} onboarding_enabled=${runtime.onboardingEnabled} trigger_matched=${trigger.matched} send_decision=${sendDecision(result.outcome)} outcome=${result.outcome} message=${liveMessage.id}${receipt}${sentMessage}${sentChannel}${result.error ? ` error=${result.error}` : ""}`);
    }).catch((error) => {
      reportGatewayError(`Discord listener failed for message ${liveMessage.id}`, error);
      console.log(`[discord listener] message_result guild_id=${runtime.guildId} channel_id=${liveMessage.channel.id} workspace_matched=true workspace_id=${runtime.workspaceId} onboarding_enabled=${runtime.onboardingEnabled} trigger_matched=${trigger.matched} send_decision=failed outcome=failed message=${liveMessage.id}`);
    });
  });
  client.on(Events.Error, (error) => reportGatewayError("Discord client error", error));
  client.on(Events.ShardError, (error) => reportGatewayError("Discord shard error", error));
  process.once("SIGTERM", () => { client.destroy(); process.exit(0); });
  process.once("SIGINT", () => { client.destroy(); process.exit(0); });
  await client.login(botToken);
}

void main().catch((error) => {
  reportGatewayError("Discord listener could not start", error);
  process.exitCode = 1;
});
