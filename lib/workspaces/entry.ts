export type WorkspaceEntryMode = "mine" | "demo";

export type WorkspaceRoute = "entry" | "mine" | "demo";

export function requiresWorkspaceChoice(selection: {
  user: unknown;
  mode: WorkspaceEntryMode;
  accessConfigured: boolean;
  route: WorkspaceRoute;
}): boolean {
  return selection.route === "entry" && !selection.user;
}

export function workspaceBasePath(mode: WorkspaceEntryMode): string {
  return mode === "demo" ? "/app/demo" : "/app/my";
}

export function workspacePath(mode: WorkspaceEntryMode, path: string): string {
  const basePath = workspaceBasePath(mode);
  return path === "/app" ? basePath : `${basePath}${path.slice("/app".length)}`;
}
