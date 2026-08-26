import "server-only";

import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";
import { createDiscordApiClient } from "@/lib/discord/client";
import { selectConnectedChannelIds, type DiscordReadableChannel } from "@/lib/discord/channels";
import { readDiscordBotToken } from "@/lib/discord/config";
import { toDiscordIntegrationError } from "@/lib/discord/errors";
import type { DiscordConfig } from "@/lib/discord/config";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

export type DiscordConnection = Tables<"discord_connections">;

function emptyChannels(): DiscordReadableChannel[] {
  return [];
}

export async function getDiscordConnection(creatorId: string): Promise<DataResult<DiscordConnection | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };
  const { data, error } = await access.client
    .from("discord_connections")
    .select("*")
    .eq("creator_id", creatorId)
    .maybeSingle();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function saveDiscordConnection(connection: TablesInsert<"discord_connections">): Promise<DataResult<DiscordConnection | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };
  const { data, error } = await access.client
    .from("discord_connections")
    .upsert(connection, { onConflict: "creator_id" })
    .select("*")
    .single();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function saveDiscordSelectedChannels(
  creatorId: string,
  requestedIds: string[],
): Promise<DataResult<DiscordConnection | null>> {
  const connectionResult = await getDiscordConnection(creatorId);
  if (connectionResult.error || !connectionResult.data) return connectionResult;
  const channelsResult = await listDiscordConnectionChannels(creatorId);
  if (channelsResult.error) return { data: null, access: channelsResult.access, error: channelsResult.error };
  const selection = selectConnectedChannelIds(requestedIds, channelsResult.data);
  if (selection.invalid.length > 0) {
    return {
      data: null,
      access: channelsResult.access,
      error: "One or more selected Discord channels are not available from the connected guild.",
    };
  }
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };
  const { data, error } = await access.client
    .from("discord_connections")
    .update({ selected_channel_ids: selection.selected })
    .eq("creator_id", creatorId)
    .select("*")
    .single();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function markDiscordConnectionImported(creatorId: string): Promise<void> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return;
  await access.client
    .from("discord_connections")
    .update({ last_import_at: new Date().toISOString() })
    .eq("creator_id", creatorId);
}

export async function listDiscordConnectionChannels(creatorId: string): Promise<DataResult<DiscordReadableChannel[]>> {
  const connectionResult = await getDiscordConnection(creatorId);
  if (connectionResult.error || !connectionResult.data) {
    return { data: emptyChannels(), access: connectionResult.access, error: connectionResult.error ?? "Connect a Discord server before selecting channels." };
  }
  try {
    const connection = connectionResult.data;
    const client = createDiscordApiClient({
      botToken: readDiscordBotToken(),
      guildId: connection.guild_id,
      monitoredChannelIds: [],
    });
    const guild = await client.getGuild();
    if (guild.id !== connection.guild_id) throw new Error("The connected Discord guild could not be verified.");
    const channels = await client.listGuildChannels();
    return {
      data: channels
        .filter((channel) => channel.type === 0 || channel.type === 5)
        .sort((left, right) => (left.name ?? left.id).localeCompare(right.name ?? right.id))
        .map((channel) => ({
          id: channel.id,
          name: channel.name?.trim() || channel.id,
          type: channel.type ?? 0,
          canRead: true,
          selected: connection.selected_channel_ids.includes(channel.id),
        })),
      access: connectionResult.access,
      error: null,
    };
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return { data: emptyChannels(), access: connectionResult.access, error: safeError.message };
  }
}

export async function getSavedDiscordImportConfig(creatorId: string): Promise<DataResult<DiscordConfig | null>> {
  const connectionResult = await getDiscordConnection(creatorId);
  if (connectionResult.error || !connectionResult.data) {
    return { data: null, access: connectionResult.access, error: connectionResult.error };
  }
  if (connectionResult.data.selected_channel_ids.length === 0) {
    return { data: null, access: connectionResult.access, error: "Select and save at least one Discord channel before importing." };
  }
  try {
    return {
      data: {
        botToken: readDiscordBotToken(),
        guildId: connectionResult.data.guild_id,
        monitoredChannelIds: connectionResult.data.selected_channel_ids,
      },
      access: connectionResult.access,
      error: null,
    };
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return { data: null, access: connectionResult.access, error: safeError.message };
  }
}
