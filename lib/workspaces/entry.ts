export type WorkspaceEntryMode = "mine" | "demo";

export function requiresWorkspaceChoice(selection: {
  user: unknown;
  mode: WorkspaceEntryMode;
  accessConfigured: boolean;
}): boolean {
  return selection.accessConfigured && !selection.user && selection.mode !== "demo";
}
