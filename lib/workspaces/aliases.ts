import type { Tables } from "@/lib/supabase/database.types";

export function getWorkspaceMindAlias(workspace: Pick<Tables<"workspaces">, "id" | "is_demo">): string {
  return workspace.is_demo ? "memora-demo-main" : `memora-workspace-${workspace.id}`;
}

export function getCreatorMindAlias(creator: Pick<Tables<"creators">, "workspace_id" | "slug">): string {
  return creator.slug === "memora-demo" || !creator.workspace_id
    ? "memora-demo-main"
    : `memora-workspace-${creator.workspace_id}`;
}
