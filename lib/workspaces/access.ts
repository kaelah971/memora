import "server-only";

import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient, getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { DataAccessStatus, DataClient } from "@/lib/data/types";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { DEMO_WORKSPACE_ID } from "@/lib/workspaces/constants";
import type { WorkspaceRoute } from "@/lib/workspaces/entry";
export { DEMO_WORKSPACE_ID } from "@/lib/workspaces/constants";
export { getCreatorMindAlias, getWorkspaceMindAlias } from "@/lib/workspaces/aliases";
export { requiresWorkspaceChoice } from "@/lib/workspaces/entry";

export type WorkspaceMode = "mine" | "demo";

export interface CurrentWorkspaceContext {
  client: DataClient;
  status: DataAccessStatus;
  mode: WorkspaceMode;
  user: User | null;
  workspace: Tables<"workspaces">;
  creator: Tables<"creators">;
}

export interface WorkspaceContextResult {
  data: CurrentWorkspaceContext | null;
  access: DataAccessStatus;
  error: string | null;
}

export interface CurrentWorkspaceSelection {
  user: User | null;
  mode: WorkspaceMode;
  route: WorkspaceRoute;
  demoAvailable: boolean;
  accessConfigured: boolean;
}

function unavailable(reason: string): WorkspaceContextResult {
  return {
    data: null,
    access: { available: false, mode: "unavailable", reason },
    error: reason,
  };
}

function developmentOrDemoAccessEnabled(environment: Record<string, string | undefined>): boolean {
  return environment.NODE_ENV !== "production"
    ? environment.MEMORA_DEV_DB_ACCESS === "service_role" || environment.MEMORA_DEMO_WORKSPACE_ACCESS === "enabled"
    : environment.MEMORA_DEMO_WORKSPACE_ACCESS === "enabled";
}

function creatorName(user: User): string {
  const emailName = user.email?.split("@", 1)[0]?.trim();
  return emailName || "Creator";
}

function workspaceName(user: User): string {
  const email = user.email?.trim();
  return email ? `${email}'s Workspace` : "My Creator Workspace";
}

async function getRequestUser(): Promise<User | null> {
  try {
    const client = await createServerSupabaseClient();
    const result = await client.auth.getUser();
    return result.error ? null : result.data.user;
  } catch {
    return null;
  }
}

export async function getCurrentWorkspaceSelection(): Promise<CurrentWorkspaceSelection> {
  const config = getSupabaseConfigStatus(process.env);
  const user = await getRequestUser();
  const routeHeader = (await headers()).get("x-memora-workspace-route");
  const route: WorkspaceRoute = routeHeader === "demo" || routeHeader === "mine" || routeHeader === "entry" ? routeHeader : "mine";
  const mode: WorkspaceMode = route === "demo" ? "demo" : "mine";

  return {
    user,
    mode,
    route,
    demoAvailable: developmentOrDemoAccessEnabled(process.env),
    accessConfigured: config.missingPublic.length === 0 && config.serviceRoleConfigured,
  };
}

async function getDemoContext(client: DataClient, status: DataAccessStatus, user: User | null): Promise<WorkspaceContextResult> {
  const workspaceResult = await client
    .from("workspaces")
    .select("*")
    .eq("id", DEMO_WORKSPACE_ID)
    .eq("is_demo", true)
    .maybeSingle();
  if (workspaceResult.error) return { data: null, access: status, error: workspaceResult.error.message };
  if (!workspaceResult.data) return unavailable("The public demo workspace is not available. Run the workspace migration first.");

  const creatorResult = await client
    .from("creators")
    .select("*")
    .eq("workspace_id", workspaceResult.data.id)
    .maybeSingle();
  if (creatorResult.error) return { data: null, access: status, error: creatorResult.error.message };
  if (!creatorResult.data) return unavailable("The public demo creator is not available. Run the idempotent demo seed first.");

  return {
    data: {
      client,
      status,
      mode: "demo",
      user,
      workspace: workspaceResult.data,
      creator: creatorResult.data,
    },
    access: status,
    error: null,
  };
}

async function findUserWorkspace(client: DataClient, user: User): Promise<Tables<"workspaces"> | null> {
  const membership = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membership.error) throw new Error(membership.error.message);
  if (membership.data) {
    const workspace = await client.from("workspaces").select("*").eq("id", membership.data.workspace_id).maybeSingle();
    if (workspace.error) throw new Error(workspace.error.message);
    return workspace.data;
  }

  const ownedWorkspace = await client.from("workspaces").select("*").eq("created_by", user.id).maybeSingle();
  if (ownedWorkspace.error) throw new Error(ownedWorkspace.error.message);
  if (ownedWorkspace.data) return ownedWorkspace.data;

  const created = await client
    .from("workspaces")
    .insert({ name: workspaceName(user), created_by: user.id, is_demo: false })
    .select("*")
    .single();
  if (!created.error && created.data) return created.data;

  if (created.error?.code === "23505") {
    const raced = await client.from("workspaces").select("*").eq("created_by", user.id).maybeSingle();
    if (raced.error) throw new Error(raced.error.message);
    return raced.data;
  }
  throw new Error(created.error?.message ?? "The creator workspace could not be created.");
}

async function ensureUserWorkspace(client: DataClient, user: User, status: DataAccessStatus): Promise<WorkspaceContextResult> {
  try {
    const workspace = await findUserWorkspace(client, user);
    if (!workspace) return unavailable("The creator workspace could not be resolved.");

    const membership = await client
      .from("workspace_members")
      .upsert(
        { workspace_id: workspace.id, user_id: user.id, role: "owner" },
        { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
      );
    if (membership.error) return { data: null, access: status, error: membership.error.message };

    let creator = await client.from("creators").select("*").eq("workspace_id", workspace.id).maybeSingle();
    if (creator.error) return { data: null, access: status, error: creator.error.message };
    if (!creator.data) {
      creator = await client
        .from("creators")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          display_name: creatorName(user),
          slug: `creator-${user.id}`,
          timezone: null,
        })
        .select("*")
        .single();
    }
    if (creator.error || !creator.data) return { data: null, access: status, error: creator.error?.message ?? "The creator profile could not be created." };

    return {
      data: { client, status, mode: "mine", user, workspace, creator: creator.data },
      access: status,
      error: null,
    };
  } catch (error) {
    return { data: null, access: status, error: error instanceof Error ? error.message : "The creator workspace could not be loaded." };
  }
}

export async function getCurrentWorkspaceContext(): Promise<WorkspaceContextResult> {
  const environment = process.env;
  const selection = await getCurrentWorkspaceSelection();
  if (!selection.accessConfigured) {
    return unavailable("Configure Supabase public variables and SUPABASE_SERVICE_ROLE_KEY for workspace access.");
  }

  let client: DataClient;
  try {
    client = createServiceRoleSupabaseClient(environment);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "Supabase configuration could not be loaded.");
  }

  const { user, mode, demoAvailable } = selection;
  const status: DataAccessStatus = {
    available: true,
    mode: user ? "authenticated" : "service_role",
    reason: null,
  };
  if (user && mode !== "demo") return ensureUserWorkspace(client, user, status);
  if (mode === "demo" && demoAvailable) return getDemoContext(client, status, user);
  if (user) return ensureUserWorkspace(client, user, status);

  return unavailable("Choose the public demo or sign in to create your workspace.");
}

export async function getCurrentWorkspace(): Promise<Tables<"workspaces"> | null> {
  return (await getCurrentWorkspaceContext()).data?.workspace ?? null;
}

export async function getCurrentCreator(): Promise<Tables<"creators"> | null> {
  return (await getCurrentWorkspaceContext()).data?.creator ?? null;
}

export async function getCurrentIntegrationWorkspaceContext(): Promise<WorkspaceContextResult> {
  const context = await getCurrentWorkspaceContext();
  if (!context.data) return context;
  if (!context.data.user && context.data.mode !== "demo") {
    return {
      data: null,
      access: context.access,
      error: "Sign in before connecting a personal YouTube channel or Discord server.",
    };
  }
  return context;
}

export type WorkspaceInsert = TablesInsert<"workspaces">;
