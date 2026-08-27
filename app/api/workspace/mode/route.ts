import { NextResponse } from "next/server";

import { WORKSPACE_MODE_COOKIE, type WorkspaceMode } from "@/lib/workspaces/access";

function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode: WorkspaceMode = url.searchParams.get("mode") === "demo" ? "demo" : "mine";
  const response = NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), request.url));
  response.cookies.set({
    name: WORKSPACE_MODE_COOKIE,
    value: mode,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
