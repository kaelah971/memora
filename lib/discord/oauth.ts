import {
  DISCORD_API_BASE_URL,
  DISCORD_BOT_PERMISSIONS,
  DISCORD_OAUTH_AUTHORIZE_URL,
  DISCORD_OAUTH_SCOPES,
  DISCORD_OAUTH_TOKEN_URL,
  type DiscordOAuthConfig,
} from "@/lib/discord/config";
import { DiscordIntegrationError } from "@/lib/discord/errors";

export interface DiscordOAuthGuild {
  id: string;
  name: string;
}

export interface DiscordOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  guild?: DiscordOAuthGuild;
}

type Fetcher = typeof fetch;

export function buildDiscordAuthorizeUrl(config: Pick<DiscordOAuthConfig, "clientId" | "redirectUri">, state: string): string {
  const url = new URL(DISCORD_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("scope", DISCORD_OAUTH_SCOPES.join(" "));
  url.searchParams.set("permissions", `${DISCORD_BOT_PERMISSIONS}`);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("integration_type", "0");
  return url.toString();
}

export async function exchangeDiscordOAuthCode(
  code: string,
  config: DiscordOAuthConfig,
  fetcher: Fetcher = fetch,
): Promise<DiscordOAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  const response = await fetcher(DISCORD_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new DiscordIntegrationError("AUTH_REQUIRED", "Discord authorization could not be completed.", 502);
  }
  let payload: DiscordOAuthTokenResponse;
  try {
    payload = await response.json() as DiscordOAuthTokenResponse;
  } catch {
    throw new DiscordIntegrationError("AUTH_REQUIRED", "Discord authorization returned an unreadable response.", 502);
  }
  if (!payload.access_token) {
    throw new DiscordIntegrationError("AUTH_REQUIRED", "Discord authorization did not return a usable token.", 502);
  }
  return payload;
}

export function discordApiUrl(path: string): string {
  return `${DISCORD_API_BASE_URL}${path}`;
}
