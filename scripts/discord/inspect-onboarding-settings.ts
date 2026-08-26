import "../load-env";

import { createServiceRoleSupabaseClient } from "../../lib/supabase/service-role";

const onboardingSettingColumns = "id, enabled, send_mode, welcome_channel_id, resource_channel_id, question_channel_id, support_channel_id, builder_channel_id, updated_at";

function printOnboardingRow(row: {
  id: string;
  enabled: boolean;
  send_mode: string;
  welcome_channel_id: string | null;
  resource_channel_id: string | null;
  question_channel_id: string | null;
  support_channel_id: string | null;
  builder_channel_id: string | null;
  updated_at: string;
}): void {
  console.log(`row id: ${row.id}`);
  console.log(`enabled: ${row.enabled}`);
  console.log(`send_mode: ${row.send_mode}`);
  console.log(`welcome_channel_id: ${row.welcome_channel_id ?? "null"}`);
  console.log(`resource_channel_id: ${row.resource_channel_id ?? "null"}`);
  console.log(`question_channel_id: ${row.question_channel_id ?? "null"}`);
  console.log(`support_channel_id: ${row.support_channel_id ?? "null"}`);
  console.log(`builder_channel_id: ${row.builder_channel_id ?? "null"}`);
  console.log(`updated_at: ${row.updated_at}`);
}

async function main(): Promise<void> {
  const client = createServiceRoleSupabaseClient();
  const { data: creator, error: creatorError } = await client
    .from("creators")
    .select("id")
    .eq("slug", "memora-demo")
    .maybeSingle();
  if (creatorError) throw new Error(`Demo creator query failed: ${creatorError.message}`);
  if (!creator) throw new Error("Demo creator was not found.");

  console.log(`demo creator id: ${creator.id}`);

  const { data: connection, error: connectionError } = await client
    .from("discord_connections")
    .select("id, guild_id, guild_name, selected_channel_ids, updated_at")
    .eq("creator_id", creator.id)
    .maybeSingle();
  if (connectionError) throw new Error(`Discord connection query failed: ${connectionError.message}`);

  if (!connection) {
    console.log("active discord connection: none");
    console.log("discord_onboarding_settings rows: none");
    return;
  }

  console.log("active discord connection:");
  console.log(`id: ${connection.id}`);
  console.log(`guild_id: ${connection.guild_id}`);
  console.log(`guild_name: ${connection.guild_name}`);
  console.log(`selected_channel_ids: ${JSON.stringify(connection.selected_channel_ids)}`);
  console.log(`updated_at: ${connection.updated_at}`);

  const { data: settingsRows, error: settingsError } = await client
    .from("discord_onboarding_settings")
    .select(onboardingSettingColumns)
    .eq("creator_id", creator.id)
    .eq("discord_connection_id", connection.id)
    .order("updated_at", { ascending: false });
  if (settingsError) throw new Error(`Onboarding settings query failed: ${settingsError.message}`);

  console.log(`discord_onboarding_settings rows: ${settingsRows.length}`);
  for (const [index, row] of settingsRows.entries()) {
    console.log(`row ${index + 1}:`);
    printOnboardingRow(row);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Onboarding settings inspection failed.");
  process.exitCode = 1;
});
