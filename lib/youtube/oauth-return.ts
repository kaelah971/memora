import type { WorkspaceMode } from "@/lib/workspaces/access";

export function getYouTubeOAuthWorkspaceMode(value: string | undefined): WorkspaceMode {
  return value === "demo" ? "demo" : "mine";
}

export function getYouTubeImportPath(mode: WorkspaceMode): string {
  return mode === "demo" ? "/app/demo/import" : "/app/my/import";
}
