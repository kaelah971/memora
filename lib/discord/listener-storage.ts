import { createWorkerSupabaseClient } from "@/lib/supabase/config";
import type { DataAccessStatus, DataClient } from "@/lib/data/types";
import type { Tables, TablesInsert, Json } from "@/lib/supabase/database.types";
import { discordAudienceMemberId, discordCreatorEventId, discordInteractionId, discordSourceId, isAnnouncementChannel } from "@/lib/discord/ids";
import { createDiscordApiClient, type DiscordChannel, type DiscordMessage } from "@/lib/discord/client";
import { readDiscordBotToken, type DiscordConfig } from "@/lib/discord/config";
import type { DiscordReadableChannel } from "@/lib/discord/channels";
import type { OnboardingReceiptStatus, OnboardingTriggerType } from "@/lib/discord/onboarding-types";
import { onboardingSettingsInput as mapOnboardingSettings, type DiscordOnboardingSettingsInput } from "@/lib/discord/onboarding-settings";
import { readDiscordOnboardingSettings } from "@/lib/discord/onboarding-settings-storage";
import { DEMO_WORKSPACE_ID } from "@/lib/workspaces/constants";

export type { DiscordOnboardingSettingsInput } from "@/lib/discord/onboarding-settings";

export type DiscordConnection = Tables<"discord_connections">;
export type DiscordOnboardingSettings = Tables<"discord_onboarding_settings">;
export type DiscordOnboardingReceipt = Tables<"discord_onboarding_receipts">;

export interface DiscordOnboardingMemory {
  member: Tables<"audience_members"> | null;
  interactions: Tables<"interactions">[];
  receipts: DiscordOnboardingReceipt[];
}

export interface DiscordListenerWorkspace {
  workspaceId: string;
  creator: Tables<"creators">;
  connection: DiscordConnection;
  onboardingSettings: DiscordOnboardingSettings | null;
}

export interface DiscordListenerStorage {
  client: DataClient;
  status: DataAccessStatus;
}

function storageError(error: { message?: string } | null, fallback: string): Error | null {
  return error ? new Error(error.message || fallback) : null;
}

function throwStorageError(error: { message?: string } | null, fallback: string): void {
  const failure = storageError(error, fallback);
  if (failure) throw failure;
}

export function createDiscordListenerStorage(): DiscordListenerStorage {
  try {
    return {
      client: createWorkerSupabaseClient(),
      status: { available: true, mode: "service_role", reason: null },
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Supabase worker configuration could not be loaded.");
  }
}

export async function getCreatorForWorkspace(
  storage: DiscordListenerStorage,
  creatorId: string,
  workspaceId: string,
): Promise<Tables<"creators">> {
  const { data, error } = await storage.client
    .from("creators")
    .select("*")
    .eq("id", creatorId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  throwStorageError(error, "The creator workspace could not be loaded.");
  if (!data) throw new Error("The creator workspace is not available.");
  return data;
}

export async function getDevelopmentCreator(storage: DiscordListenerStorage): Promise<Tables<"creators">> {
  const { data, error } = await storage.client
    .from("creators")
    .select("*")
    .eq("slug", "memora-demo")
    .eq("workspace_id", DEMO_WORKSPACE_ID)
    .maybeSingle();
  throwStorageError(error, "The creator workspace could not be loaded.");
  if (!data) throw new Error("The creator workspace is not available.");
  return data;
}

export async function listDiscordListenerWorkspaces(
  storage: DiscordListenerStorage,
): Promise<DiscordListenerWorkspace[]> {
  const connectionsResult = await storage.client
    .from("discord_connections")
    .select("*")
    .order("updated_at", { ascending: false });
  throwStorageError(connectionsResult.error, "The Discord connections could not be loaded.");
  const connections = connectionsResult.data ?? [];
  if (connections.length === 0) return [];

  const creatorIds = [...new Set(connections.map((connection) => connection.creator_id))];
  const connectionIds = connections.map((connection) => connection.id);
  const [creatorsResult, settingsResult] = await Promise.all([
    storage.client.from("creators").select("*").in("id", creatorIds),
    storage.client.from("discord_onboarding_settings").select("*").in("discord_connection_id", connectionIds),
  ]);
  throwStorageError(creatorsResult.error, "The Discord listener creators could not be loaded.");
  throwStorageError(settingsResult.error, "The Discord onboarding settings could not be loaded.");

  const creatorsById = new Map((creatorsResult.data ?? []).map((creator) => [creator.id, creator]));
  const settingsByConnectionId = new Map((settingsResult.data ?? []).map((settings) => [settings.discord_connection_id, settings]));
  return connections.flatMap((connection) => {
    const creator = creatorsById.get(connection.creator_id);
    if (!creator || !connection.workspace_id || (creator.workspace_id && creator.workspace_id !== connection.workspace_id)) return [];
    const settings = settingsByConnectionId.get(connection.id);
    const workspaceSettings = settings && settings.creator_id === creator.id && (!settings.workspace_id || settings.workspace_id === connection.workspace_id)
      ? settings
      : null;
    return [{
      workspaceId: connection.workspace_id,
      creator,
      connection,
      onboardingSettings: workspaceSettings,
    }];
  });
}

export async function getDiscordConnection(
  storage: DiscordListenerStorage,
  creatorId: string,
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<DiscordConnection | null> {
  const { data, error } = await storage.client
    .from("discord_connections")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  throwStorageError(error, "The Discord connection could not be loaded.");
  return data;
}

export async function listDiscordConnectionChannels(
  connection: DiscordConnection,
): Promise<DiscordReadableChannel[]> {
  const client = createDiscordApiClient({
    botToken: readDiscordBotToken(),
    guildId: connection.guild_id,
    monitoredChannelIds: [],
  });
  const guild = await client.getGuild();
  if (guild.id !== connection.guild_id) throw new Error("The connected Discord guild could not be verified.");
  const channels = await client.listGuildChannels();
  return channels
    .filter((channel) => channel.type === 0 || channel.type === 5)
    .sort((left, right) => (left.name ?? left.id).localeCompare(right.name ?? right.id))
    .map((channel) => ({
      id: channel.id,
      name: channel.name?.trim() || channel.id,
      type: channel.type ?? 0,
      canRead: true,
      selected: connection.selected_channel_ids.includes(channel.id),
    }));
}

export async function getDiscordOnboardingSettings(
  storage: DiscordListenerStorage,
  creatorId: string,
  connectionId: string,
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<DiscordOnboardingSettings | null> {
  const result = await readDiscordOnboardingSettings(storage.client, creatorId, connectionId, workspaceId);
  if (result.error) throw new Error(result.error);
  return result.data;
}

export async function getDiscordMemberMemory(
  storage: DiscordListenerStorage,
  creatorId: string,
  discordUserId: string,
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<DiscordOnboardingMemory> {
  const memberResult = await storage.client
    .from("audience_members")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .eq("platform", "discord")
    .eq("platform_user_id", discordUserId)
    .maybeSingle();
  throwStorageError(memberResult.error, "The Discord member memory could not be loaded.");

  const member = memberResult.data;
  const interactionsResult = member
    ? await storage.client
        .from("interactions")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("workspace_id", workspaceId)
        .eq("audience_member_id", member.id)
        .order("published_at", { ascending: false })
        .limit(12)
    : { data: [], error: null };
  const receiptsResult = await storage.client
    .from("discord_onboarding_receipts")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .eq("discord_user_id", discordUserId)
    .order("created_at", { ascending: false })
    .limit(12);
  throwStorageError(interactionsResult.error, "The Discord member interactions could not be loaded.");
  throwStorageError(receiptsResult.error, "The Discord onboarding receipts could not be loaded.");

  return {
    member,
    interactions: interactionsResult.data ?? [],
    receipts: receiptsResult.data ?? [],
  };
}

export async function findRecentDiscordOnboardingReceipt(
  storage: DiscordListenerStorage,
  input: {
    creatorId: string;
    connectionId: string;
    workspaceId?: string;
    discordUserId: string;
    triggerType: OnboardingTriggerType;
    sourceMessageId: string | null;
  },
): Promise<DiscordOnboardingReceipt | null> {
  if (!input.sourceMessageId) return null;

  const { data, error } = await storage.client
    .from("discord_onboarding_receipts")
    .select("*")
    .eq("creator_id", input.creatorId)
    .eq("discord_connection_id", input.connectionId)
    .eq("workspace_id", input.workspaceId ?? DEMO_WORKSPACE_ID)
    .eq("source_message_id", input.sourceMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwStorageError(error, "The Discord onboarding receipt could not be checked.");
  return data;
}

export async function createDiscordOnboardingReceipt(
  storage: DiscordListenerStorage,
  receipt: TablesInsert<"discord_onboarding_receipts">,
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<DiscordOnboardingReceipt> {
  const { data, error } = await storage.client
    .from("discord_onboarding_receipts")
    .insert({ ...receipt, workspace_id: workspaceId })
    .select("*")
    .single();
  throwStorageError(error, "The Discord onboarding receipt could not be saved.");
  if (!data) throw new Error("The Discord onboarding receipt could not be saved.");
  return data;
}

export async function updateDiscordOnboardingReceipt(
  storage: DiscordListenerStorage,
  receiptId: string,
  update: Partial<Pick<DiscordOnboardingReceipt, "mind_conversation_id" | "sent_message_id" | "status" | "reason">>,
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<DiscordOnboardingReceipt> {
  const { data, error } = await storage.client
    .from("discord_onboarding_receipts")
    .update(update)
    .eq("id", receiptId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();
  throwStorageError(error, "The Discord onboarding receipt could not be updated.");
  if (!data) throw new Error("The Discord onboarding receipt could not be updated.");
  return data;
}

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function recordOnboardingMemory(
  storage: DiscordListenerStorage,
  input: {
    workspaceId?: string;
    creatorId: string;
    connectionId: string;
    guildId: string;
    channelId: string;
    channelName: string;
    discordUserId: string;
    discordUsername: string;
    receiptId: string;
    generatedMessage: string;
    status: OnboardingReceiptStatus;
    sentMessageId: string | null;
  },
): Promise<{ interactionId: string }> {
  const workspaceId = input.workspaceId ?? DEMO_WORKSPACE_ID;
  const now = new Date().toISOString();
  const sourceId = discordSourceId(input.creatorId, input.guildId, input.channelId);
  const source: TablesInsert<"sources"> = {
    id: sourceId,
    creator_id: input.creatorId,
    workspace_id: workspaceId,
    platform: "discord",
    source_type: "discord_channel",
    external_id: input.channelId,
    title: `#${input.channelName}`,
    url: `https://discord.com/channels/${input.guildId}/${input.channelId}`,
    published_at: null,
    metadata: {
      discord_guild_id: input.guildId,
      discord_channel_id: input.channelId,
      discord_channel_name: input.channelName,
      onboarding_channel: true,
      read_only: true,
    },
  };
  const sourceResult = await storage.client.from("sources").upsert(source, { onConflict: "id" }).select("id").single();
  throwStorageError(sourceResult.error, "The onboarding source could not be saved.");
  if (!sourceResult.data) throw new Error("The onboarding source could not be saved.");

  const memberId = discordAudienceMemberId(input.creatorId, input.discordUserId);
  const existingMember = await storage.client
    .from("audience_members")
    .select("first_seen_at, last_seen_at")
    .eq("id", memberId)
    .eq("creator_id", input.creatorId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  throwStorageError(existingMember.error, "The Discord member could not be loaded.");
  const member: TablesInsert<"audience_members"> = {
    id: memberId,
    creator_id: input.creatorId,
    workspace_id: workspaceId,
    platform: "discord",
    platform_user_id: input.discordUserId,
    display_name: input.discordUsername,
    avatar_url: null,
    first_seen_at: existingMember.data?.first_seen_at ?? now,
    last_seen_at: existingMember.data?.last_seen_at && existingMember.data.last_seen_at > now ? existingMember.data.last_seen_at : now,
  };
  const memberResult = await storage.client.from("audience_members").upsert(member, { onConflict: "id" });
  throwStorageError(memberResult.error, "The Discord member could not be saved.");

  const interactionId = discordInteractionId(input.creatorId, `onboarding:${input.receiptId}`);
  const interaction: TablesInsert<"interactions"> = {
    id: interactionId,
    creator_id: input.creatorId,
    workspace_id: workspaceId,
    audience_member_id: memberId,
    source_id: sourceId,
    platform: "discord",
    interaction_type: "creator_reply",
    external_id: `onboarding:${input.receiptId}`,
    text: input.generatedMessage,
    published_at: now,
    creator_replied: true,
    parent_interaction_id: null,
    like_count: null,
    reply_count: null,
    raw_metadata: {
      onboarding_receipt_id: input.receiptId,
      onboarding_status: input.status,
      discord_connection_id: input.connectionId,
      discord_guild_id: input.guildId,
      discord_channel_id: input.channelId,
      discord_user_id: input.discordUserId,
      sent_message_id: input.sentMessageId,
      read_only_import: true,
    },
  };
  const interactionResult = await storage.client.from("interactions").upsert(interaction, { onConflict: "id" });
  throwStorageError(interactionResult.error, "The onboarding interaction could not be saved.");
  return { interactionId };
}

export async function updateOnboardingMemoryStatus(
  storage: DiscordListenerStorage,
  interactionId: string,
  status: OnboardingReceiptStatus,
  sentMessageId: string | null,
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<void> {
  const existing = await storage.client.from("interactions").select("raw_metadata").eq("id", interactionId).eq("workspace_id", workspaceId).maybeSingle();
  throwStorageError(existing.error, "The onboarding interaction could not be loaded.");
  const rawMetadata = existing.data?.raw_metadata;
  const metadata: Record<string, Json | undefined> = rawMetadata && isRecord(rawMetadata) ? rawMetadata : {};
  const { error } = await storage.client
    .from("interactions")
    .update({ raw_metadata: { ...metadata, onboarding_status: status, sent_message_id: sentMessageId } })
    .eq("id", interactionId)
    .eq("workspace_id", workspaceId);
  throwStorageError(error, "The onboarding interaction could not be updated.");
}

function channelName(channel: DiscordChannel): string {
  return channel.name?.trim() || channel.id;
}

function channelUrl(guildId: string, channelId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function messageUrl(guildId: string, channelId: string, messageId: string): string {
  return `${channelUrl(guildId, channelId)}/${messageId}`;
}

function displayName(message: DiscordMessage): string {
  return message.author.global_name?.trim() || message.author.username?.trim() || `Discord member ${message.author.id}`;
}

function messageTitle(message: DiscordMessage): string {
  return message.content.split(/\r?\n/, 1)[0]?.trim().slice(0, 160) || "Discord announcement";
}

function earlierDate(left: string, right: string): string {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

function laterDate(left: string, right: string): string {
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

export async function persistDiscordMessage(
  storage: DiscordListenerStorage,
  creatorId: string,
  config: DiscordConfig,
  guildName: string,
  channel: DiscordChannel,
  message: DiscordMessage,
  options: { allowUnmonitored?: boolean } = {},
  workspaceId = DEMO_WORKSPACE_ID,
): Promise<void> {
  if (!config.monitoredChannelIds.includes(channel.id) && !options.allowUnmonitored) throw new Error("That Discord channel is not configured for import.");
  if (channel.guild_id && channel.guild_id !== config.guildId) throw new Error("The Discord channel belongs to a different guild.");
  if (message.author.bot || !message.content.trim()) return;

  const occurredAt = new Date(message.timestamp);
  if (!Number.isFinite(occurredAt.getTime())) throw new Error("The Discord message timestamp is invalid.");
  const content = message.content.trim();
  const sourceId = discordSourceId(creatorId, config.guildId, channel.id);
  const source: TablesInsert<"sources"> = {
    id: sourceId,
    creator_id: creatorId,
    workspace_id: workspaceId,
    platform: "discord",
    source_type: "discord_channel",
    external_id: channel.id,
    title: `#${channelName(channel)}`,
    url: channelUrl(config.guildId, channel.id),
    published_at: null,
    metadata: {
      discord_guild_id: config.guildId,
      discord_channel_id: channel.id,
      discord_channel_name: channelName(channel),
      read_only: true,
    },
  };
  const sourceResult = await storage.client.from("sources").upsert(source, { onConflict: "id" });
  throwStorageError(sourceResult.error, "Discord source facts could not be saved.");

  if (isAnnouncementChannel(channel)) {
    const event: TablesInsert<"creator_events"> = {
      id: discordCreatorEventId(creatorId, message.id),
      creator_id: creatorId,
      workspace_id: workspaceId,
      event_type: "product_update",
      source_id: sourceId,
      external_id: message.id,
      title: messageTitle(message),
      description: content,
      occurred_at: occurredAt.toISOString(),
      payload: {
        platform: "discord",
        discord_message_id: message.id,
        discord_channel_id: channel.id,
        discord_guild_id: config.guildId,
        discord_message_url: messageUrl(config.guildId, channel.id, message.id),
        read_only: true,
      },
    };
    const eventResult = await storage.client.from("creator_events").upsert(event, { onConflict: "id" });
    throwStorageError(eventResult.error, "Discord announcements could not be saved.");
    return;
  }

  const memberId = discordAudienceMemberId(creatorId, message.author.id);
  const existingMember = await storage.client
    .from("audience_members")
    .select("first_seen_at, last_seen_at")
    .eq("id", memberId)
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  throwStorageError(existingMember.error, "Discord community members could not be checked.");
  const occurredAtText = occurredAt.toISOString();
  const memberResult = await storage.client.from("audience_members").upsert({
    id: memberId,
    creator_id: creatorId,
    workspace_id: workspaceId,
    platform: "discord",
    platform_user_id: message.author.id,
    display_name: displayName(message),
    avatar_url: message.author.avatar ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` : null,
    first_seen_at: existingMember.data ? earlierDate(existingMember.data.first_seen_at, occurredAtText) : occurredAtText,
    last_seen_at: existingMember.data ? laterDate(existingMember.data.last_seen_at, occurredAtText) : occurredAtText,
  }, { onConflict: "id" });
  throwStorageError(memberResult.error, "Discord community members could not be saved.");

  const interaction: TablesInsert<"interactions"> = {
    id: discordInteractionId(creatorId, message.id),
    creator_id: creatorId,
    workspace_id: workspaceId,
    audience_member_id: memberId,
    source_id: sourceId,
    platform: "discord",
    interaction_type: "comment",
    external_id: message.id,
    text: content,
    published_at: occurredAtText,
    creator_replied: false,
    parent_interaction_id: null,
    like_count: null,
    reply_count: null,
    raw_metadata: {
      discord_message_id: message.id,
      discord_channel_id: channel.id,
      discord_guild_id: config.guildId,
      discord_message_url: messageUrl(config.guildId, channel.id, message.id),
      author_username: message.author.username ?? null,
      read_only: true,
    },
  };
  const interactionResult = await storage.client.from("interactions").upsert(interaction, { onConflict: "id" });
  throwStorageError(interactionResult.error, `Discord community message could not be saved for ${guildName}.`);
}

export function onboardingSettingsInput(
  settings: DiscordOnboardingSettings | null,
  allowedChannelIds?: readonly string[],
): DiscordOnboardingSettingsInput {
  return mapOnboardingSettings(settings, allowedChannelIds);
}
