import "server-only";

import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export interface DiscordImportStatus {
  channelCount: number;
  messageCount: number;
  communityMemberCount: number;
  creatorEventCount: number;
  lastImportedAt: string | null;
}

export async function getDiscordImportStatus(creatorId: string): Promise<DataResult<DiscordImportStatus>> {
  const access = getDevelopmentDataAccess();
  const empty: DiscordImportStatus = {
    channelCount: 0,
    messageCount: 0,
    communityMemberCount: 0,
    creatorEventCount: 0,
    lastImportedAt: null,
  };
  if (!access.client) return { data: empty, access: access.status, error: access.status.reason };

  const [sourcesResult, interactionsResult, membersResult, eventsResult] = await Promise.all([
    access.client.from("sources").select("id, imported_at").eq("creator_id", creatorId).eq("platform", "discord"),
    access.client.from("interactions").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).eq("platform", "discord"),
    access.client.from("audience_members").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).eq("platform", "discord"),
    access.client.from("creator_events").select("id, source_id").eq("creator_id", creatorId).eq("event_type", "product_update"),
  ]);
  const queryError = [sourcesResult, interactionsResult, membersResult, eventsResult].find((result) => result.error)?.error;
  if (queryError) return { data: empty, access: access.status, error: queryError.message };

  const importedAt = (sourcesResult.data ?? []).map((source) => source.imported_at).sort().at(-1) ?? null;
  return {
    data: {
      channelCount: sourcesResult.data?.length ?? 0,
      messageCount: interactionsResult.count ?? 0,
      communityMemberCount: membersResult.count ?? 0,
      creatorEventCount: (eventsResult.data ?? []).filter((event) =>
        event.source_id !== null && new Set((sourcesResult.data ?? []).map((source) => source.id)).has(event.source_id),
      ).length,
      lastImportedAt: importedAt,
    },
    access: access.status,
    error: null,
  };
}
