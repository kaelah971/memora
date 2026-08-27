import { google } from "googleapis";

import {
  readYouTubeConfig,
  YOUTUBE_OAUTH_SCOPES,
} from "@/lib/youtube/config";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import { updateYouTubeConnection } from "@/lib/youtube/storage";
import { decryptYouTubeToken, encryptYouTubeToken } from "@/lib/youtube/tokens";
import type { YouTubeConnectionRecord } from "@/lib/youtube/types";

export function createGoogleOAuthClient() {
  const config = readYouTubeConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function getYouTubeAuthorizationUrl(state: string): string {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [...YOUTUBE_OAUTH_SCOPES],
    state,
  });
}

export interface ConnectedYouTubeChannel {
  channelId: string;
  title: string;
  handle: string | null;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | null;
  scopes: string[];
}

export type YouTubeOAuthExchangeStage = "token_exchange" | "channel_lookup";

export async function exchangeYouTubeOAuthCode(
  code: string,
  onStage?: (stage: YouTubeOAuthExchangeStage) => void,
): Promise<{
  channel: ConnectedYouTubeChannel;
  tokens: OAuthTokenSet;
}> {
  try {
    const client = createGoogleOAuthClient();
    onStage?.("token_exchange");
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) throw new YouTubeIntegrationError("auth_required", 401);

    client.setCredentials(tokens);
    onStage?.("channel_lookup");
    const response = await google.youtube({ version: "v3", auth: client }).channels.list({
      part: ["snippet"],
      mine: true,
      maxResults: 1,
    });
    const channel = response.data.items?.[0];
    if (!channel?.id || !channel.snippet?.title) {
      throw new YouTubeIntegrationError("channel_missing", 422);
    }

    return {
      channel: {
        channelId: channel.id,
        title: channel.snippet.title,
        handle: channel.snippet.customUrl ?? null,
      },
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiryDate: tokens.expiry_date ?? null,
        scopes: tokens.scope?.split(" ").filter(Boolean) ?? [...YOUTUBE_OAUTH_SCOPES],
      },
    };
  } catch (error) {
    throw toYouTubeIntegrationError(error, "api_error");
  }
}

async function persistRefreshedTokens(
  connection: YouTubeConnectionRecord,
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined,
  expiryDate: number | null | undefined,
): Promise<void> {
  if (!accessToken && !refreshToken && !expiryDate) return;
  const config = readYouTubeConfig();
  await updateYouTubeConnection(connection.creator_id, {
    ...(accessToken ? { access_token_ciphertext: encryptYouTubeToken(accessToken, config.tokenEncryptionKey) } : {}),
    ...(refreshToken
      ? { refresh_token_ciphertext: encryptYouTubeToken(refreshToken, config.tokenEncryptionKey) }
      : {}),
    ...(expiryDate ? { token_expires_at: new Date(expiryDate).toISOString() } : {}),
  });
}

export async function createAuthenticatedYouTubeClient(connection: YouTubeConnectionRecord) {
  try {
    const config = readYouTubeConfig();
    const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
    const refreshToken = connection.refresh_token_ciphertext
      ? decryptYouTubeToken(connection.refresh_token_ciphertext, config.tokenEncryptionKey)
      : null;
    const accessToken = decryptYouTubeToken(connection.access_token_ciphertext, config.tokenEncryptionKey);

    client.setCredentials({
      access_token: accessToken,
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
      ...(connection.token_expires_at
        ? { expiry_date: new Date(connection.token_expires_at).getTime() }
        : {}),
    });

    client.on("tokens", (tokens) => {
      void persistRefreshedTokens(connection, tokens.access_token, tokens.refresh_token, tokens.expiry_date);
    });

    if (
      connection.token_expires_at &&
      new Date(connection.token_expires_at).getTime() <= Date.now() + 60_000
    ) {
      if (!refreshToken) throw new YouTubeIntegrationError("auth_required", 401);
      await client.getAccessToken();
      await persistRefreshedTokens(
        connection,
        client.credentials.access_token,
        client.credentials.refresh_token,
        client.credentials.expiry_date,
      );
    }

    return {
      auth: client,
      youtube: google.youtube({ version: "v3", auth: client }),
    };
  } catch (error) {
    throw toYouTubeIntegrationError(error, "auth_required");
  }
}
