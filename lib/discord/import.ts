import type { TablesInsert } from "@/lib/supabase/database.types";

import { getDevelopmentDataAccess } from "@/lib/data/access";
import { readDiscordConfig, type DiscordConfig } from "@/lib/discord/config";
import {
  createDiscordApiClient,
  type DiscordApiClient,
  type DiscordChannel,
  type DiscordMessage,
} from "@/lib/discord/client";
import { DiscordIntegrationError } from "@/lib/discord/errors";
import {
  discordAudienceMemberId,
  discordCreatorEventId,
  discordInteractionId,
  discordSourceId,
  isAnnouncementChannel,
} from "@/lib/discord/ids";
export {
  discordAudienceMemberId,
  discordCreatorEventId,
  discordInteractionId,
  discordSourceId,
  isAnnouncementChannel,
} from "@/lib/discord/ids";

export interface DiscordChannelImportSummary {
  channelId: string;
  channelName: string;
  messagesFetched: number;
  messagesImported: number;
  messagesAlreadyKnown: number;
  botMessagesIgnored: number;
}

export interface DiscordImportSummary {
  guildId: string;
  guildName: string;
  channelsRead: number;
  messagesFetched: number;
  messagesImported: number;
  messagesAlreadyKnown: number;
  botMessagesIgnored: number;
  emptyMessagesIgnored: number;
  audienceMembersCreated: number;
  audienceMembersUpdated: number;
  audienceMembersFound: number;
  creatorEventsCreated: number;
  creatorEventsFound: number;
  opportunitiesFound: number;
  channels: DiscordChannelImportSummary[];
}

interface ImportedMessage {
  channel: DiscordChannel;
  message: DiscordMessage;
  isAnnouncement: boolean;
  occurredAt: string;
}

function earlierDate(left: string, right: string): string {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

function laterDate(left: string, right: string): string {
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
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
  const firstLine = message.content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return firstLine.slice(0, 160) || "Discord announcement";
}

function validMessage(message: DiscordMessage): string | null {
  if (!message.id || !message.channel_id || !message.author?.id) return null;
  const timestamp = new Date(message.timestamp);
  if (!Number.isFinite(timestamp.getTime())) return null;
  const content = message.content.trim();
  return content ? timestamp.toISOString() : null;
}

function configuredChannelIds(config: DiscordConfig): string[] {
  return [...new Set(config.monitoredChannelIds)];
}

export async function importDiscordMessages(
  creatorId: string,
  config: DiscordConfig = readDiscordConfig(),
  requestedLimit = 50,
  apiClient: DiscordApiClient = createDiscordApiClient(config),
): Promise<DiscordImportSummary> {
  const access = getDevelopmentDataAccess();
  if (!access.client) throw new DiscordIntegrationError("STORAGE", access.status.reason ?? "Discord database access is unavailable.", 503);

  const guild = await apiClient.getGuild();
  if (guild.id !== config.guildId) {
    throw new DiscordIntegrationError("GUILD_NOT_FOUND", "The configured Discord guild could not be verified.", 409);
  }
  const limit = Math.max(1, Math.min(50, Math.floor(requestedLimit)));
  const fetchedByChannel: Array<{ channel: DiscordChannel; messages: DiscordMessage[] }> = [];
  for (const channelId of configuredChannelIds(config)) {
    const channel = await apiClient.getChannel(channelId);
    if (channel.guild_id && channel.guild_id !== config.guildId) {
      throw new DiscordIntegrationError("CHANNEL_NOT_FOUND", "A configured Discord channel belongs to a different guild.", 409);
    }
    fetchedByChannel.push({ channel, messages: await apiClient.getMessages(channelId, limit) });
  }

  const sourceRows: TablesInsert<"sources">[] = fetchedByChannel.map(({ channel }) => ({
    id: discordSourceId(creatorId, config.guildId, channel.id),
    creator_id: creatorId,
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
  }));
  const sourceResult = sourceRows.length > 0
    ? await access.client.from("sources").upsert(sourceRows, { onConflict: "id" })
    : { error: null };
  if (sourceResult.error) throw new DiscordIntegrationError("STORAGE", "Discord source facts could not be saved.", 500);

  const importedMessages: ImportedMessage[] = [];
  let botMessagesIgnored = 0;
  let emptyMessagesIgnored = 0;
  const channelSummaries: DiscordChannelImportSummary[] = [];
  for (const { channel, messages } of fetchedByChannel) {
    let importedForChannel = 0;
    for (const message of messages) {
      if (message.author?.bot) {
        botMessagesIgnored += 1;
        continue;
      }
      const occurredAt = validMessage(message);
      if (!occurredAt) {
        emptyMessagesIgnored += 1;
        continue;
      }
      importedForChannel += 1;
      importedMessages.push({ channel, message, isAnnouncement: isAnnouncementChannel(channel), occurredAt });
    }
    channelSummaries.push({
      channelId: channel.id,
      channelName: `#${channelName(channel)}`,
      messagesFetched: messages.length,
      messagesImported: importedForChannel,
      messagesAlreadyKnown: 0,
      botMessagesIgnored: messages.filter((message) => Boolean(message.author?.bot)).length,
    });
  }

  const interactionMessages = importedMessages.filter((row) => !row.isAnnouncement);
  const eventMessages = importedMessages.filter((row) => row.isAnnouncement);
  const interactionExternalIds = interactionMessages.map(({ message }) => message.id);
  const eventExternalIds = eventMessages.map(({ message }) => message.id);
  const [existingInteractionsResult, existingEventsResult] = await Promise.all([
    interactionExternalIds.length > 0
      ? access.client.from("interactions").select("external_id").eq("creator_id", creatorId).eq("platform", "discord").in("external_id", interactionExternalIds)
      : Promise.resolve({ data: [], error: null }),
    eventExternalIds.length > 0
      ? access.client.from("creator_events").select("external_id").eq("creator_id", creatorId).eq("event_type", "product_update").in("external_id", eventExternalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (existingInteractionsResult.error || existingEventsResult.error) {
    throw new DiscordIntegrationError("STORAGE", "Existing Discord message facts could not be checked.", 500);
  }
  const existingInteractionIds = new Set((existingInteractionsResult.data ?? []).flatMap((row) => row.external_id ? [row.external_id] : []));
  const existingEventIds = new Set((existingEventsResult.data ?? []).flatMap((row) => row.external_id ? [row.external_id] : []));

  const memberRows = new Map<string, TablesInsert<"audience_members">>();
  for (const { message, occurredAt } of interactionMessages) {
    const id = discordAudienceMemberId(creatorId, message.author.id);
    const current = memberRows.get(id);
    memberRows.set(id, {
      id,
      creator_id: creatorId,
      platform: "discord",
      platform_user_id: message.author.id,
      display_name: displayName(message),
      avatar_url: message.author.avatar ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` : null,
      first_seen_at: current ? earlierDate(current.first_seen_at, occurredAt) : occurredAt,
      last_seen_at: current ? laterDate(current.last_seen_at, occurredAt) : occurredAt,
    });
  }
  const memberIds = [...memberRows.keys()];
  const existingMembersResult = memberIds.length > 0
    ? await access.client.from("audience_members").select("id, first_seen_at, last_seen_at").eq("creator_id", creatorId).eq("platform", "discord").in("id", memberIds)
    : { data: [], error: null };
  if (existingMembersResult.error) throw new DiscordIntegrationError("STORAGE", "Discord community members could not be checked.", 500);
  const existingMembers = new Map((existingMembersResult.data ?? []).map((member) => [member.id, member]));
  for (const [id, member] of memberRows) {
    const existing = existingMembers.get(id);
    if (existing) {
      member.first_seen_at = earlierDate(existing.first_seen_at, member.first_seen_at);
      member.last_seen_at = laterDate(existing.last_seen_at, member.last_seen_at);
    }
  }
  if (memberRows.size > 0) {
    const memberResult = await access.client.from("audience_members").upsert([...memberRows.values()], { onConflict: "id" });
    if (memberResult.error) throw new DiscordIntegrationError("STORAGE", "Discord community members could not be saved.", 500);
  }

  const sourceIdByChannel = new Map(sourceRows.map((source) => [source.external_id as string, source.id as string]));
  const interactionRows: TablesInsert<"interactions">[] = interactionMessages.map(({ channel, message, occurredAt }) => ({
    id: discordInteractionId(creatorId, message.id),
    creator_id: creatorId,
    audience_member_id: discordAudienceMemberId(creatorId, message.author.id),
    source_id: sourceIdByChannel.get(channel.id) as string,
    platform: "discord",
    interaction_type: "comment",
    external_id: message.id,
    text: message.content.trim(),
    published_at: occurredAt,
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
  }));
  if (interactionRows.length > 0) {
    const interactionResult = await access.client.from("interactions").upsert(interactionRows, { onConflict: "id" });
    if (interactionResult.error) throw new DiscordIntegrationError("STORAGE", "Discord community messages could not be saved.", 500);
  }

  const eventRows: TablesInsert<"creator_events">[] = eventMessages.map(({ channel, message, occurredAt }) => ({
    id: discordCreatorEventId(creatorId, message.id),
    creator_id: creatorId,
    event_type: "product_update",
    source_id: sourceIdByChannel.get(channel.id) as string,
    external_id: message.id,
    title: messageTitle(message),
    description: message.content.trim(),
    occurred_at: occurredAt,
    payload: {
      platform: "discord",
      discord_message_id: message.id,
      discord_channel_id: channel.id,
      discord_guild_id: config.guildId,
      discord_message_url: messageUrl(config.guildId, channel.id, message.id),
      read_only: true,
    },
  }));
  if (eventRows.length > 0) {
    const eventResult = await access.client.from("creator_events").upsert(eventRows, { onConflict: "id" });
    if (eventResult.error) throw new DiscordIntegrationError("STORAGE", "Discord announcements could not be saved.", 500);
  }

  const insertedMessages = interactionMessages.filter(({ message }) => !existingInteractionIds.has(message.id)).length +
    eventMessages.filter(({ message }) => !existingEventIds.has(message.id)).length;
  const alreadyKnownMessages = importedMessages.length - insertedMessages;
  for (const summary of channelSummaries) {
    const channelMessages = importedMessages.filter(({ channel }) => channel.id === summary.channelId);
    summary.messagesImported = channelMessages.filter(({ message }) =>
      !existingInteractionIds.has(message.id) && !existingEventIds.has(message.id),
    ).length;
    summary.messagesAlreadyKnown = channelMessages.filter(({ message }) =>
      existingInteractionIds.has(message.id) || existingEventIds.has(message.id),
    ).length;
  }

  return {
    guildId: config.guildId,
    guildName: guild.name,
    channelsRead: fetchedByChannel.length,
    messagesFetched: fetchedByChannel.reduce((total, entry) => total + entry.messages.length, 0),
    messagesImported: insertedMessages,
    messagesAlreadyKnown: alreadyKnownMessages,
    botMessagesIgnored,
    emptyMessagesIgnored,
    audienceMembersCreated: [...memberRows.keys()].filter((id) => !existingMembers.has(id)).length,
    audienceMembersUpdated: [...memberRows.keys()].filter((id) => existingMembers.has(id)).length,
    audienceMembersFound: memberRows.size,
    creatorEventsCreated: eventRows.filter((event) => !existingEventIds.has(event.external_id as string)).length,
    creatorEventsFound: eventRows.length,
    opportunitiesFound: 0,
    channels: channelSummaries,
  };
}

export async function persistDiscordMessage(
  creatorId: string,
  config: DiscordConfig,
  guildName: string,
  channel: DiscordChannel,
  message: DiscordMessage,
): Promise<DiscordImportSummary> {
  if (!config.monitoredChannelIds.includes(channel.id)) {
    throw new DiscordIntegrationError("INVALID_REQUEST", "That Discord channel is not configured for import.", 400);
  }

  const singleChannelConfig = { ...config, monitoredChannelIds: [channel.id] };
  const apiClient = createDiscordApiClient(singleChannelConfig);
  return importDiscordMessages(creatorId, singleChannelConfig, 1, {
    ...apiClient,
    getGuild: async () => ({ id: config.guildId, name: guildName }),
    getChannel: async () => channel,
    getMessages: async () => [message],
  });
}
