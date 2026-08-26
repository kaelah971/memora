import type { Tables } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listRecentInteractions(
  creatorId: string,
  limit = 50,
): Promise<DataResult<Tables<"interactions">[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("interactions")
    .select("*")
    .eq("creator_id", creatorId)
    .order("published_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function getAudienceMemberTimeline(
  creatorId: string,
  audienceMemberId: string,
): Promise<DataResult<Tables<"interactions">[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("interactions")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("audience_member_id", audienceMemberId)
    .order("published_at", { ascending: true });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}
