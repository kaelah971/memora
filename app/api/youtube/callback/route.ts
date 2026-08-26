import { NextRequest, NextResponse } from "next/server";

import { readYouTubeConfig } from "@/lib/youtube/config";
import { encryptYouTubeToken } from "@/lib/youtube/tokens";
import {
  exchangeYouTubeOAuthCode,
  getDevelopmentCreator,
  getYouTubeConnection,
  isValidOAuthState,
  toYouTubeIntegrationError,
  upsertYouTubeConnection,
  YOUTUBE_OAUTH_STATE_COOKIE,
} from "@/lib/youtube/server";

function redirectToImport(request: Request, reason?: string) {
  const url = new URL("/app/import", request.url);
  if (reason) url.searchParams.set("youtube", reason);
  return NextResponse.redirect(url);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: YOUTUBE_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/youtube",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? undefined;
  const expectedState = request.cookies.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value;
  if (!isValidOAuthState(expectedState, state)) {
    return clearStateCookie(redirectToImport(request, "invalid_state"));
  }

  if (params.get("error")) {
    return clearStateCookie(redirectToImport(request, "oauth_denied"));
  }

  const code = params.get("code");
  if (!code) return clearStateCookie(redirectToImport(request, "invalid_request"));

  try {
    const creator = await getDevelopmentCreator();
    const { channel, tokens } = await exchangeYouTubeOAuthCode(code);
    const config = readYouTubeConfig();
    const existingConnection = await getYouTubeConnection(creator.id);
    const existingRefreshToken = existingConnection?.youtube_channel_id === channel.channelId
      ? existingConnection.refresh_token_ciphertext
      : null;
    await upsertYouTubeConnection({
      creator_id: creator.id,
      google_account_id: null,
      youtube_channel_id: channel.channelId,
      youtube_channel_title: channel.title,
      youtube_channel_handle: channel.handle,
      access_token_ciphertext: encryptYouTubeToken(tokens.accessToken, config.tokenEncryptionKey),
      refresh_token_ciphertext: tokens.refreshToken
        ? encryptYouTubeToken(tokens.refreshToken, config.tokenEncryptionKey)
        : existingRefreshToken,
      token_expires_at: tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : null,
      scopes: tokens.scopes,
      connected_at: new Date().toISOString(),
      last_synced_at: null,
    });
    return clearStateCookie(redirectToImport(request, "connected"));
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error);
    return clearStateCookie(redirectToImport(request, safeError.code));
  }
}
