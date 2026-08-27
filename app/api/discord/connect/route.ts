import { NextResponse } from "next/server";

import {
  buildDiscordAuthorizeUrl,
  createDiscordOAuthState,
  getDiscordOAuthConfigStatus,
  readDiscordBotToken,
  readDiscordOAuthConfig,
  toDiscordIntegrationError,
  DISCORD_OAUTH_STATE_COOKIE,
} from "@/lib/discord/server";
import { DiscordIntegrationError } from "@/lib/discord/errors";
import { getCurrentIntegrationWorkspaceContext } from "@/lib/workspaces/access";

function redirectToImport(request: Request, reason?: string) {
  const url = new URL("/app/import/discord", request.url);
  if (reason) url.searchParams.set("discord", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    const context = await getCurrentIntegrationWorkspaceContext();
    if (!context.data) throw new DiscordIntegrationError("AUTH_REQUIRED", context.error ?? "Sign in before connecting Discord.", 401);
    const status = getDiscordOAuthConfigStatus();
    if (!status.ready) return redirectToImport(request, "oauth_config_missing");
    const config = readDiscordOAuthConfig();
    readDiscordBotToken();
    const state = createDiscordOAuthState();
    const response = NextResponse.redirect(buildDiscordAuthorizeUrl(config, state));
    response.cookies.set({
      name: DISCORD_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/discord",
    });
    return response;
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return redirectToImport(request, safeError.code.toLowerCase());
  }
}
