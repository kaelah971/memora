import {
  DISCORD_API_BASE_URL,
  type DiscordConfig,
} from "@/lib/discord/config";
import { DiscordIntegrationError } from "@/lib/discord/errors";

export interface DiscordGuild {
  id: string;
  name: string;
}

export interface DiscordChannel {
  id: string;
  guild_id?: string;
  name?: string;
  type?: number;
}

export interface DiscordMessageAuthor {
  id: string;
  username?: string;
  global_name?: string | null;
  bot?: boolean;
  avatar?: string | null;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
  author: DiscordMessageAuthor;
  type?: number;
}

export interface DiscordApiClient {
  getGuild(): Promise<DiscordGuild>;
  listGuildChannels(): Promise<DiscordChannel[]>;
  getChannel(channelId: string): Promise<DiscordChannel>;
  getMessages(channelId: string, limit: number): Promise<DiscordMessage[]>;
  sendMessage(channelId: string, content: string): Promise<DiscordMessage>;
}

type Fetcher = typeof fetch;

async function request<T>(token: string, path: string, fetcher: Fetcher, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bot ${token}`);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "Memora/0.1 Discord importer");
  const response = await fetcher(`${DISCORD_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...Object.fromEntries(headers.entries()),
    },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new DiscordIntegrationError("AUTH_REQUIRED", "The Discord bot could not access this resource.", response.status);
  }
  if (response.status === 404) {
    throw new DiscordIntegrationError("API", "The Discord resource was not found.", 404);
  }
  if (response.status === 429) {
    throw new DiscordIntegrationError("RATE_LIMITED", "Discord rate limited the import. Try again later.", 429);
  }
  if (!response.ok) throw new DiscordIntegrationError("API", "Discord returned an unexpected response.", 502);
  try {
    return await response.json() as T;
  } catch {
    throw new DiscordIntegrationError("API", "Discord returned an unreadable response.", 502);
  }
}

export function createDiscordApiClient(config: DiscordConfig, fetcher: Fetcher = fetch): DiscordApiClient {
  return {
    getGuild: () => request<DiscordGuild>(config.botToken, `/guilds/${config.guildId}`, fetcher),
    listGuildChannels: () => request<DiscordChannel[]>(config.botToken, `/guilds/${config.guildId}/channels`, fetcher),
    getChannel: (channelId) => {
      if (!config.monitoredChannelIds.includes(channelId)) {
        return Promise.reject(new DiscordIntegrationError("INVALID_REQUEST", "That Discord channel is not configured for import.", 400));
      }
      return request<DiscordChannel>(config.botToken, `/channels/${channelId}`, fetcher);
    },
    getMessages: (channelId, limit) => {
      if (!config.monitoredChannelIds.includes(channelId)) {
        return Promise.reject(new DiscordIntegrationError("INVALID_REQUEST", "That Discord channel is not configured for import.", 400));
      }
      const boundedLimit = Math.max(1, Math.min(50, Math.floor(limit)));
      return request<DiscordMessage[]>(config.botToken, `/channels/${channelId}/messages?limit=${boundedLimit}`, fetcher);
    },
    sendMessage: (channelId, content) => {
      if (!config.monitoredChannelIds.includes(channelId)) {
        return Promise.reject(new DiscordIntegrationError("INVALID_REQUEST", "That Discord channel is not configured for onboarding messages.", 400));
      }
      const message = content.trim();
      if (!message || message.length > 2_000) {
        return Promise.reject(new DiscordIntegrationError("INVALID_REQUEST", "The onboarding message is empty or too long.", 400));
      }
      return request<DiscordMessage>(config.botToken, `/channels/${channelId}/messages`, fetcher, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
      });
    },
  };
}
