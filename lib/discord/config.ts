export const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
export const DISCORD_GUILD_ID_ENV = "DISCORD_GUILD_ID";
export const DISCORD_MONITORED_CHANNEL_IDS_ENV = "DISCORD_MONITORED_CHANNEL_IDS";
export const DISCORD_CLIENT_ID_ENV = "DISCORD_CLIENT_ID";
export const DISCORD_CLIENT_SECRET_ENV = "DISCORD_CLIENT_SECRET";
export const DISCORD_REDIRECT_URI_ENV = "DISCORD_REDIRECT_URI";
export const DISCORD_IMPORT_DEFAULT_LIMIT = 50;
export const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
export const DISCORD_OAUTH_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
export const DISCORD_OAUTH_TOKEN_URL = "https://discord.com/api/oauth2/token";
export const DISCORD_OAUTH_SCOPES = ["bot", "applications.commands"] as const;
export const DISCORD_READ_PERMISSIONS = 66560;
export const DISCORD_SEND_MESSAGES_PERMISSION = 2048;
export const DISCORD_BOT_PERMISSIONS = DISCORD_READ_PERMISSIONS | DISCORD_SEND_MESSAGES_PERMISSION;

export interface DiscordConfig {
  botToken: string;
  guildId: string;
  monitoredChannelIds: string[];
}

export interface DiscordConfigStatus {
  botTokenConfigured: boolean;
  guildIdConfigured: boolean;
  monitoredChannelsConfigured: boolean;
  configuredGuildId: string | null;
  monitoredChannelIds: string[];
  missing: string[];
  ready: boolean;
}

export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface DiscordOAuthConfigStatus {
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUriConfigured: boolean;
  botTokenConfigured: boolean;
  missing: string[];
  ready: boolean;
}

export class DiscordConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "DiscordConfigError";
    this.missing = missing;
  }
}

type Environment = Record<string, string | undefined>;

function readValue(environment: Environment, key: string): string | undefined {
  const value = environment[key]?.trim();
  return value || undefined;
}

function isDiscordId(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

function readChannelIds(environment: Environment): string[] {
  return [...new Set((readValue(environment, DISCORD_MONITORED_CHANNEL_IDS_ENV) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isDiscordId(value)))];
}

function validHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getDiscordOAuthConfigStatus(environment: Environment = process.env): DiscordOAuthConfigStatus {
  const clientId = readValue(environment, DISCORD_CLIENT_ID_ENV);
  const clientSecret = readValue(environment, DISCORD_CLIENT_SECRET_ENV);
  const redirectUri = readValue(environment, DISCORD_REDIRECT_URI_ENV);
  const missing = [
    !clientId ? DISCORD_CLIENT_ID_ENV : null,
    !clientSecret ? DISCORD_CLIENT_SECRET_ENV : null,
    !validHttpUrl(redirectUri) ? DISCORD_REDIRECT_URI_ENV : null,
    !readValue(environment, DISCORD_BOT_TOKEN_ENV) ? DISCORD_BOT_TOKEN_ENV : null,
  ].filter((key): key is string => Boolean(key));

  return {
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    redirectUriConfigured: validHttpUrl(redirectUri),
    botTokenConfigured: Boolean(readValue(environment, DISCORD_BOT_TOKEN_ENV)),
    missing,
    ready: missing.length === 0,
  };
}

export function readDiscordOAuthConfig(environment: Environment = process.env): DiscordOAuthConfig {
  const clientId = readValue(environment, DISCORD_CLIENT_ID_ENV);
  const clientSecret = readValue(environment, DISCORD_CLIENT_SECRET_ENV);
  const redirectUri = readValue(environment, DISCORD_REDIRECT_URI_ENV);
  const missing = [
    !clientId ? DISCORD_CLIENT_ID_ENV : null,
    !clientSecret ? DISCORD_CLIENT_SECRET_ENV : null,
    !validHttpUrl(redirectUri) ? DISCORD_REDIRECT_URI_ENV : null,
  ].filter((key): key is string => Boolean(key));
  if (missing.length > 0) {
    throw new DiscordConfigError(`Discord OAuth configuration is incomplete. Missing: ${missing.join(", ")}.`, missing);
  }
  return { clientId: clientId as string, clientSecret: clientSecret as string, redirectUri: redirectUri as string };
}

export function readDiscordBotToken(environment: Environment = process.env): string {
  const token = readValue(environment, DISCORD_BOT_TOKEN_ENV);
  if (!token) throw new DiscordConfigError(`Discord bot configuration is incomplete. Missing: ${DISCORD_BOT_TOKEN_ENV}.`, [DISCORD_BOT_TOKEN_ENV]);
  return token;
}

export function getDiscordConfigStatus(environment: Environment = process.env): DiscordConfigStatus {
  const token = readValue(environment, DISCORD_BOT_TOKEN_ENV);
  const guildId = readValue(environment, DISCORD_GUILD_ID_ENV);
  const monitoredChannelIds = readChannelIds(environment);
  const missing = [
    !token ? DISCORD_BOT_TOKEN_ENV : null,
    !guildId || !isDiscordId(guildId) ? DISCORD_GUILD_ID_ENV : null,
    monitoredChannelIds.length === 0 ? DISCORD_MONITORED_CHANNEL_IDS_ENV : null,
  ].filter((key): key is string => Boolean(key));

  return {
    botTokenConfigured: Boolean(token),
    guildIdConfigured: Boolean(guildId && isDiscordId(guildId)),
    monitoredChannelsConfigured: monitoredChannelIds.length > 0,
    configuredGuildId: guildId && isDiscordId(guildId) ? guildId : null,
    monitoredChannelIds,
    missing,
    ready: missing.length === 0,
  };
}

export function readDiscordConfig(environment: Environment = process.env): DiscordConfig {
  const token = readValue(environment, DISCORD_BOT_TOKEN_ENV);
  const guildId = readValue(environment, DISCORD_GUILD_ID_ENV);
  const monitoredChannelIds = readChannelIds(environment);
  const missing = [
    !token ? DISCORD_BOT_TOKEN_ENV : null,
    !guildId || !isDiscordId(guildId) ? DISCORD_GUILD_ID_ENV : null,
    monitoredChannelIds.length === 0 ? DISCORD_MONITORED_CHANNEL_IDS_ENV : null,
  ].filter((key): key is string => Boolean(key));

  if (missing.length > 0) {
    throw new DiscordConfigError(
      `Discord configuration is incomplete. Missing: ${missing.join(", ")}.`,
      missing,
    );
  }

  return {
    botToken: token as string,
    guildId: guildId as string,
    monitoredChannelIds,
  };
}
