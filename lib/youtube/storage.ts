import { assertDemoWorkspaceAccess, assertDevelopmentServiceRoleAccess } from "@/lib/supabase/config";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import type { YouTubeConnectionPublic } from "@/lib/youtube/types";

export type YouTubeConnectionInsert = TablesInsert<"youtube_connections">;
export type YouTubeConnectionUpdate = TablesUpdate<"youtube_connections">;

type Environment = Record<string, string | undefined>;

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

export async function getDevelopmentCreator(): Promise<Tables<"creators">> {
  const client = getTrustedYouTubeClient();
  const { data, error } = await client
    .from("creators")
    .select("*")
    .eq("slug", "memora-demo")
    .maybeSingle();

  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  if (!data) throw new YouTubeIntegrationError("workspace_unavailable", 503);
  return data;
}

export async function getYouTubeConnection(
  creatorId: string,
): Promise<Tables<"youtube_connections"> | null> {
  const client = getTrustedYouTubeClient();
  const { data, error } = await client
    .from("youtube_connections")
    .select("*")
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  return data;
}

export async function getPublicYouTubeConnection(
  creatorId: string,
): Promise<YouTubeConnectionPublic | null> {
  const client = getTrustedYouTubeClient();
  const { data, error } = await client
    .from("youtube_connections")
    .select(
      "id, creator_id, google_account_id, youtube_channel_id, youtube_channel_title, youtube_channel_handle, token_expires_at, scopes, connected_at, last_synced_at, created_at, updated_at",
    )
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  return data;
}

export async function upsertYouTubeConnection(
  connection: YouTubeConnectionInsert,
): Promise<Tables<"youtube_connections">> {
  const client = getTrustedYouTubeClient();
  const { data, error } = await client
    .from("youtube_connections")
    .upsert(connection, { onConflict: "creator_id" })
    .select("*")
    .single();

  if (error || !data) throw new YouTubeIntegrationError("storage_error", 500);
  return data;
}

export async function updateYouTubeConnection(
  creatorId: string,
  update: YouTubeConnectionUpdate,
): Promise<void> {
  const client = getTrustedYouTubeClient();
  const { error } = await client.from("youtube_connections").update(update).eq("creator_id", creatorId);
  if (error) throw new YouTubeIntegrationError("storage_error", 500);
}

export async function getExistingSourceIds(
  creatorId: string,
  externalIds: string[],
): Promise<Set<string>> {
  if (externalIds.length === 0) return new Set();
  const client = getTrustedYouTubeClient();
  const { data, error } = await client
    .from("sources")
    .select("external_id")
    .eq("creator_id", creatorId)
    .eq("platform", "youtube")
    .in("external_id", externalIds);
  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  return new Set((data ?? []).flatMap((row) => (row.external_id ? [row.external_id] : [])));
}

export async function getExistingAudienceMembers(ids: string[]): Promise<
  Map<string, Pick<Tables<"audience_members">, "id" | "first_seen_at" | "last_seen_at">>
> {
  if (ids.length === 0) return new Map();
  const client = getTrustedYouTubeClient();
  const { data, error } = await client
    .from("audience_members")
    .select("id, first_seen_at, last_seen_at")
    .in("id", ids);
  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  return new Map((data ?? []).map((row) => [row.id, row]));
}

export async function getExistingInteractionIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const client = getTrustedYouTubeClient();
  const { data, error } = await client.from("interactions").select("id").in("id", ids);
  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  return new Set((data ?? []).map((row) => row.id));
}

export async function getExistingCreatorEventIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const client = getTrustedYouTubeClient();
  const { data, error } = await client.from("creator_events").select("id").in("id", ids);
  if (error) throw new YouTubeIntegrationError("storage_error", 500);
  return new Set((data ?? []).map((row) => row.id));
}

export async function getImportedVideoIds(creatorId: string, videoIds: string[]): Promise<Set<string>> {
  return getExistingSourceIds(creatorId, videoIds);
}

export async function markYouTubeSynced(creatorId: string): Promise<void> {
  await updateYouTubeConnection(creatorId, { last_synced_at: new Date().toISOString() });
}
