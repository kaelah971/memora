import { NextResponse } from "next/server";

import type { WorkspaceMode } from "@/lib/workspaces/access";
import { workspacePath } from "@/lib/workspaces/entry";

function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

function explicitDestination(mode: WorkspaceMode, nextPath: string): string {
  if (nextPath === "/app") return workspacePath(mode, nextPath);
  if (nextPath.startsWith("/app/demo") || nextPath.startsWith("/app/my")) return nextPath;
  return nextPath.startsWith("/app/") ? workspacePath(mode, nextPath) : nextPath;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode: WorkspaceMode = url.searchParams.get("mode") === "demo" ? "demo" : "mine";
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const destination = explicitDestination(mode, nextPath);
  return NextResponse.redirect(new URL(destination, request.url));
}
