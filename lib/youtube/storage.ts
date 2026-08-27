import { assertDemoWorkspaceAccess, assertDevelopmentServiceRoleAccess } from "@/lib/supabase/config";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { DEMO_WORKSPACE_ID } from "@/lib/workspaces/constants";
import type { WorkspaceMode } from "@/lib/workspaces/access";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import type { YouTubeConnectionPublic } from "@/lib/youtube/types";

export type YouTubeConnectionInsert = TablesInsert<"youtube_connections">;
export type YouTubeConnectionUpdate = TablesUpdate<"youtube_connections">;

type Environment = Record<string, string | undefined>;

function diagnosticValue(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, 240) : undefined;
}

function throwStorageError(operation: string, error: unknown): never {
  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>;
    console.error(`[memora/youtube/storage] ${operation}`, {
      code: diagnosticValue(details.code),
      message: diagnosticValue(details.message),
      details: diagnosticValue(details.details),
      hint: diagnosticValue(details.hint),
    });
  } else {
    console.error(`[memora/youtube/storage] ${operation}`, {
      message: diagnosticValue(error instanceof Error ? error.message : error),
    });
  }
  throw new YouTubeIntegrationError("storage_error", 500);
}

export function getTrustedYouTubeClient(environment: Environment = process.env) {
  if (environment.NODE_ENV === "production") {
    try {
      assertDemoWorkspaceAccess(environment);
    } catch {
      throw new YouTubeIntegrationError(
        "workspace_unavailable",
        503,
        "Production workspace access is disabled. Set MEMORA_DEMO_WORKSPACE_ACCESS=enabled on the server for the hackathon demo workspace.",
      );
    }
  } else {
    try {
      assertDevelopmentServiceRoleAccess(environment);
    } catch (error) {
      throw toYouTubeIntegrationError(error, "config_missing");
    }
  }

  try {
    return createServiceRoleSupabaseClient(environment);
  } catch (error) {
    throw toYouTubeIntegrationError(error, "config_missing");
  }
}

export async function getCurrentYouTubeClient(mode?: WorkspaceMode) {
  const { getCurrentDataAccess } = await import("@/lib/data/access");
  const access = await getCurrentDataAccess(mode);
  if (!access.client) {
    throw new YouTubeIntegrationError("workspace_unavailable", 503, access.status.reason ?? "The current workspace is unavailable.");
  }
  return access.client;
}

export async function getCurrentYouTubeAccess(creatorId?: string, mode?: WorkspaceMode) {
  const { getCurrentDataAccess } = await import("@/lib/data/access");
  const access = await getCurrentDataAccess(mode);
  const client = access.client;
  const workspaceId = access.workspaceId;
  if (!client || !workspaceId || (creatorId && access.creatorId !== creatorId)) {
    throw new YouTubeIntegrationError("workspace_unavailable", 503, access.status.reason ?? "The current workspace is unavailable.");
  }
  return { ...access, client, workspaceId };
}

export async function getDevelopmentCreator(): Promise<Tables<"creators">> {
  const { getCurrentWorkspaceContext } = await import("@/lib/workspaces/access");
  const context = await getCurrentWorkspaceContext();
  if (context.data) return context.data.creator;

  if (process.env.NODE_ENV !== "production" && process.env.MEMORA_DEV_DB_ACCESS === "service_role") {
    const client = getTrustedYouTubeClient();
    const { data, error } = await client
      .from("creators")
      .select("*")
      .eq("slug", "memora-demo")
      .eq("workspace_id", DEMO_WORKSPACE_ID)
      .maybeSingle();
    if (error) throwStorageError("get_development_creator", error);
    if (data) return data;
  }

  throw new YouTubeIntegrationError("workspace_unavailable", 503, context.error ?? "The current workspace is unavailable.");
}

export async function getYouTubeConnection(
  creatorId: string,
  mode?: WorkspaceMode,
): Promise<Tables<"youtube_connections"> | null> {
  const access = await getCurrentYouTubeAccess(creatorId, mode);
  const { data, error } = await access.client
    .from("youtube_connections")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", access.workspaceId)
    .maybeSingle();

  if (error) throwStorageError("get_connection", error);
  return data;
}

export async function getPublicYouTubeConnection(
  creatorId: string,
  mode?: WorkspaceMode,
): Promise<YouTubeConnectionPublic | null> {
  const access = await getCurrentYouTubeAccess(creatorId, mode);
  const { data, error } = await access.client
    .from("youtube_connections")
    .select(
      "id, creator_id, google_account_id, youtube_channel_id, youtube_channel_title, youtube_channel_handle, token_expires_at, scopes, connected_at, last_synced_at, created_at, updated_at",
    )
    .eq("creator_id", creatorId)
    .eq("workspace_id", access.workspaceId)
    .maybeSingle();

  if (error) throwStorageError("get_public_connection", error);
  return data;
}

export async function upsertYouTubeConnection(
  connection: YouTubeConnectionInsert,
  mode?: WorkspaceMode,
): Promise<Tables<"youtube_connections">> {
  const access = await getCurrentYouTubeAccess(connection.creator_id, mode);
  const { data, error } = await access.client
    .from("youtube_connections")
    .upsert({ ...connection, workspace_id: access.workspaceId }, { onConflict: "creator_id" })
    .select("*")
    .single();

  if (error) throwStorageError("upsert_connection", error);
  if (!data) throwStorageError("upsert_connection", new Error("Supabase returned no saved YouTube connection."));
  return data;
}

export async function updateYouTubeConnection(
  creatorId: string,
  update: YouTubeConnectionUpdate,
  mode?: WorkspaceMode,
): Promise<void> {
  const access = await getCurrentYouTubeAccess(creatorId, mode);
  const { error } = await access.client
    .from("youtube_connections")
    .update(update)
    .eq("creator_id", creatorId)
    .eq("workspace_id", access.workspaceId);
  if (error) throwStorageError("update_connection", error);
}

export async function getExistingSourceIds(
  creatorId: string,
  externalIds: string[],
): Promise<Set<string>> {
  if (externalIds.length === 0) return new Set();
  const access = await getCurrentYouTubeAccess(creatorId);
  const { data, error } = await access.client
    .from("sources")
    .select("external_id")
    .eq("creator_id", creatorId)
    .eq("workspace_id", access.workspaceId)
    .eq("platform", "youtube")
    .in("external_id", externalIds);
  if (error) throwStorageError("get_existing_source_ids", error);
  return new Set((data ?? []).flatMap((row) => (row.external_id ? [row.external_id] : [])));
}

export async function getExistingAudienceMembers(creatorId: string, ids: string[]): Promise<
  Map<string, Pick<Tables<"audience_members">, "id" | "first_seen_at" | "last_seen_at">>
> {
  if (ids.length === 0) return new Map();
  const access = await getCurrentYouTubeAccess(creatorId);
  const { data, error } = await access.client
    .from("audience_members")
    .select("id, first_seen_at, last_seen_at")
    .eq("creator_id", creatorId)
    .eq("workspace_id", access.workspaceId)
    .in("id", ids);
  if (error) throwStorageError("get_existing_audience_members", error);
  return new Map((data ?? []).map((row) => [row.id, row]));
}

export async function getExistingInteractionIds(creatorId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const access = await getCurrentYouTubeAccess(creatorId);
  const { data, error } = await access.client.from("interactions").select("id").eq("creator_id", creatorId).eq("workspace_id", access.workspaceId).in("id", ids);
  if (error) throwStorageError("get_existing_interaction_ids", error);
  return new Set((data ?? []).map((row) => row.id));
}

export async function getExistingCreatorEventIds(creatorId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const access = await getCurrentYouTubeAccess(creatorId);
  const { data, error } = await access.client.from("creator_events").select("id").eq("creator_id", creatorId).eq("workspace_id", access.workspaceId).in("id", ids);
  if (error) throwStorageError("get_existing_creator_event_ids", error);
  return new Set((data ?? []).map((row) => row.id));
}

export async function getImportedVideoIds(creatorId: string, videoIds: string[]): Promise<Set<string>> {
  return getExistingSourceIds(creatorId, videoIds);
}

export async function markYouTubeSynced(creatorId: string): Promise<void> {
  await updateYouTubeConnection(creatorId, { last_synced_at: new Date().toISOString() });
}
