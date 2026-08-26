import { NextRequest, NextResponse } from "next/server";

import { getDevelopmentCreator } from "@/lib/youtube/server";
import { createDiscordApiClient } from "@/lib/discord/client";
import {
  exchangeDiscordOAuthCode,
  getDiscordOAuthConfigStatus,
  readDiscordBotToken,
  readDiscordOAuthConfig,
  toDiscordIntegrationError,
  isValidDiscordOAuthState,
  saveDiscordConnection,
  DISCORD_OAUTH_STATE_COOKIE,
} from "@/lib/discord/server";

function redirectToImport(request: Request, reason?: string) {
  const url = new URL("/app/import/discord", request.url);
  if (reason) url.searchParams.set("discord", reason);
  return NextResponse.redirect(url);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: DISCORD_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/discord",
  });
  return response;
}

function discordId(value: string | null): string | null {
  return value && /^\d{17,20}$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const receivedState = params.get("state") ?? undefined;
  const expectedState = request.cookies.get(DISCORD_OAUTH_STATE_COOKIE)?.value;
  if (!isValidDiscordOAuthState(expectedState, receivedState)) {
    return clearStateCookie(redirectToImport(request, "invalid_state"));
  }
  if (params.get("error")) return clearStateCookie(redirectToImport(request, "oauth_denied"));
  const code = params.get("code");
  if (!code) return clearStateCookie(redirectToImport(request, "invalid_request"));

  try {
    const status = getDiscordOAuthConfigStatus();
    if (!status.ready) throw new Error("Discord OAuth configuration is incomplete.");
    const config = readDiscordOAuthConfig();
    const tokenResponse = await exchangeDiscordOAuthCode(code, config);
    const queryGuildId = discordId(params.get("guild_id"));
    const tokenGuildId = discordId(tokenResponse.guild?.id ?? null);
    if (queryGuildId && tokenGuildId && queryGuildId !== tokenGuildId) {
      throw new Error("Discord returned conflicting guild installation details.");
    }
    const guildId = tokenGuildId ?? queryGuildId;
    if (!guildId) throw new Error("Discord did not return the installed guild.");

    const client = createDiscordApiClient({
      botToken: readDiscordBotToken(),
      guildId,
      monitoredChannelIds: [],
    });
    const guild = await client.getGuild();
    if (guild.id !== guildId) throw new Error("The installed Discord guild could not be verified.");

    const creator = await getDevelopmentCreator();
    const saved = await saveDiscordConnection({
      creator_id: creator.id,
      guild_id: guild.id,
      guild_name: guild.name,
      installed_by_user_id: null,
      selected_channel_ids: [],
      last_import_at: null,
    });
    if (saved.error || !saved.data) throw new Error(saved.error ?? "The Discord connection could not be saved.");
    return clearStateCookie(redirectToImport(request, "connected"));
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return clearStateCookie(redirectToImport(request, safeError.code.toLowerCase()));
  }
}
