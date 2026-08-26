import { NextResponse } from "next/server";

import {
  createOAuthState,
  getDevelopmentCreator,
  getYouTubeAuthorizationUrl,
  toYouTubeIntegrationError,
  YOUTUBE_OAUTH_STATE_COOKIE,
} from "@/lib/youtube/server";

function redirectToImport(request: Request, reason?: string) {
  const url = new URL("/app/import", request.url);
  if (reason) url.searchParams.set("youtube", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    await getDevelopmentCreator();
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
