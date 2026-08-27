import { NextRequest, NextResponse } from "next/server";

import { readYouTubeConfig } from "@/lib/youtube/config";
import {
  exchangeYouTubeOAuthCode,
  isValidOAuthState,
  persistYouTubeOAuthConnection,
  YOUTUBE_OAUTH_RETURN_COOKIE,
  toYouTubeIntegrationError,
  YOUTUBE_OAUTH_STATE_COOKIE,
} from "@/lib/youtube/server";
import { getCurrentIntegrationWorkspaceContext } from "@/lib/workspaces/access";
import { YouTubeIntegrationError } from "@/lib/youtube/errors";
import type { WorkspaceMode } from "@/lib/workspaces/access";
import { getYouTubeImportPath, getYouTubeOAuthWorkspaceMode } from "@/lib/youtube/oauth-return";

function redirectToImport(request: Request, mode: WorkspaceMode, reason?: string) {
  const url = new URL(getYouTubeImportPath(mode), request.url);
  if (reason) url.searchParams.set("youtube", reason);
  return NextResponse.redirect(url);
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set({
    name: YOUTUBE_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/youtube",
  });
  response.cookies.set({
    name: YOUTUBE_OAUTH_RETURN_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/youtube",
  });
  return response;
}

function describeOAuthError(error: unknown) {
  if (error instanceof YouTubeIntegrationError) {
    return { name: error.name, code: error.code, status: error.status, message: error.message.slice(0, 240) };
  }
  if (error instanceof Error) return { name: error.name, message: error.message.slice(0, 240) };
  return { name: "UnknownError" };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requestedMode = getYouTubeOAuthWorkspaceMode(request.cookies.get(YOUTUBE_OAUTH_RETURN_COOKIE)?.value);
  let redirectMode = requestedMode;
  const state = params.get("state") ?? undefined;
  const expectedState = request.cookies.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value;
  if (!isValidOAuthState(expectedState, state)) {
    return clearOAuthCookies(redirectToImport(request, requestedMode, "invalid_state"));
  }

  if (params.get("error")) {
    return clearOAuthCookies(redirectToImport(request, requestedMode, "oauth_denied"));
  }

  const code = params.get("code");
  if (!code) return clearOAuthCookies(redirectToImport(request, requestedMode, "invalid_request"));

  let stage = "resolve_session_workspace_creator";
  let workspaceId: string | undefined;
  let creatorId: string | undefined;
  try {
    const context = await getCurrentIntegrationWorkspaceContext(requestedMode);
    if (!context.data) throw new YouTubeIntegrationError("auth_required", 401, context.error ?? "Sign in before connecting YouTube.");
    redirectMode = context.data.mode;
    workspaceId = context.data.workspace.id;
    creatorId = context.data.creator.id;
    stage = "encryption_config";
    const config = readYouTubeConfig();
    const { channel, tokens } = await exchangeYouTubeOAuthCode(code, (exchangeStage) => {
      stage = exchangeStage;
    });
    await persistYouTubeOAuthConnection({
      context: context.data,
      channel,
      tokens,
      tokenEncryptionKey: config.tokenEncryptionKey,
      onStage: (persistenceStage) => {
        stage = persistenceStage;
      },
    });
    return clearOAuthCookies(redirectToImport(request, redirectMode, "connected"));
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error, stage === "encryption_config" ? "config_missing" : "api_error");
    console.error("[memora/youtube/oauth-callback]", {
      stage,
      requestedMode,
      redirectMode,
      workspaceId,
      creatorId,
      error: describeOAuthError(error),
    });
    return clearOAuthCookies(redirectToImport(request, redirectMode, safeError.code));
  }
}
