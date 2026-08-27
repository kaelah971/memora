import type { DataClient } from "@/lib/data/types";
import type { DiscordOnboardingSettings } from "@/lib/discord/onboarding-settings";
import type { TablesInsert } from "@/lib/supabase/database.types";

export async function readDiscordOnboardingSettings(
  client: DataClient,
  creatorId: string,
  connectionId: string,
  workspaceId?: string,
): Promise<{ data: DiscordOnboardingSettings | null; error: string | null }> {
  let query = client
    .from("discord_onboarding_settings")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("discord_connection_id", connectionId);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query.maybeSingle();
  return { data, error: error?.message ?? null };
}

export async function writeDiscordOnboardingSettings(
  client: DataClient,
  row: TablesInsert<"discord_onboarding_settings">,
): Promise<{ data: DiscordOnboardingSettings | null; error: string | null }> {
  const { data, error } = await client
    .from("discord_onboarding_settings")
    .upsert(row, { onConflict: "creator_id" })
    .select("*")
    .single();
  return { data, error: error?.message ?? null };
}
