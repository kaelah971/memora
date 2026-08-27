import type { Tables } from "@/lib/supabase/database.types";
import { getCurrentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listRecentInteractions(
  creatorId: string,
  limit = 50,
): Promise<DataResult<Tables<"interactions">[]>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: [], access: access.status, error: access.status.reason ?? "The creator profile does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("interactions")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function getAudienceMemberTimeline(
  creatorId: string,
  audienceMemberId: string,
): Promise<DataResult<Tables<"interactions">[]>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return { data: [], access: access.status, error: access.status.reason ?? "The creator profile does not belong to the active workspace." };
  }

  const { data, error } = await access.client
    .from("interactions")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .eq("audience_member_id", audienceMemberId)
    .order("published_at", { ascending: true });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}
