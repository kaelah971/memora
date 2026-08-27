import { NextResponse } from "next/server";

import {
  createOAuthState,
  getYouTubeAuthorizationUrl,
  toYouTubeIntegrationError,
  YOUTUBE_OAUTH_STATE_COOKIE,
} from "@/lib/youtube/server";
import { getCurrentIntegrationWorkspaceContext } from "@/lib/workspaces/access";
import { YouTubeIntegrationError } from "@/lib/youtube/errors";

function redirectToImport(request: Request, reason?: string) {
  const url = new URL("/app/import", request.url);
  if (reason) url.searchParams.set("youtube", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    const context = await getCurrentIntegrationWorkspaceContext();
    if (!context.data) throw new YouTubeIntegrationError("auth_required", 401, context.error ?? "Sign in before connecting YouTube.");
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
    return response;
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error, "config_missing");
    return redirectToImport(request, safeError.code);
  }
}
