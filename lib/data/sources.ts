import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { getDevelopmentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";

export async function listSources(creatorId: string): Promise<DataResult<Tables<"sources">[]>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: [], access: access.status, error: access.status.reason };

  const { data, error } = await access.client
    .from("sources")
    .select("*")
    .eq("creator_id", creatorId)
    .order("published_at", { ascending: false, nullsFirst: false });

  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function createSource(
  source: TablesInsert<"sources">,
): Promise<DataResult<Tables<"sources"> | null>> {
  const access = getDevelopmentDataAccess();
  if (!access.client) return { data: null, access: access.status, error: access.status.reason };

  if (source.external_id) {
    const existing = await access.client
      .from("sources")
      .select("*")
      .eq("creator_id", source.creator_id)
      .eq("platform", source.platform)
      .eq("external_id", source.external_id)
      .maybeSingle();
    if (existing.error) return { data: null, access: access.status, error: existing.error.message };
    if (existing.data) return { data: existing.data, access: access.status, error: null };
  }

  const { data, error } = await access.client.from("sources").insert(source).select("*").single();
  return { data, access: access.status, error: error?.message ?? null };
}
