import { NextResponse } from "next/server";

import {
  createOAuthState,
  getYouTubeAuthorizationUrl,
  YOUTUBE_OAUTH_RETURN_COOKIE,
  toYouTubeIntegrationError,
  YOUTUBE_OAUTH_STATE_COOKIE,
} from "@/lib/youtube/server";
import { getCurrentIntegrationWorkspaceContext, getCurrentWorkspaceSelection } from "@/lib/workspaces/access";
import type { WorkspaceMode } from "@/lib/workspaces/access";
import { YouTubeIntegrationError } from "@/lib/youtube/errors";
import { getYouTubeImportPath } from "@/lib/youtube/oauth-return";

function redirectToImport(request: Request, mode: WorkspaceMode, reason?: string) {
  const url = new URL(getYouTubeImportPath(mode), request.url);
  if (reason) url.searchParams.set("youtube", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  let mode: WorkspaceMode = "mine";
  try {
    const selection = await getCurrentWorkspaceSelection();
    mode = selection.user ? "mine" : selection.mode;
    const context = await getCurrentIntegrationWorkspaceContext(mode);
    if (!context.data) throw new YouTubeIntegrationError("auth_required", 401, context.error ?? "Sign in before connecting YouTube.");
    mode = context.data.mode;
    const state = createOAuthState();
    const response = NextResponse.redirect(getYouTubeAuthorizationUrl(state));
    response.cookies.set({
      name: YOUTUBE_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/youtube",
    });
    response.cookies.set({
      name: YOUTUBE_OAUTH_RETURN_COOKIE,
      value: mode,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/youtube",
    });
    return response;
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error, "config_missing");
    return redirectToImport(request, mode, safeError.code);
  }
}
