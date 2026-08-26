import "../load-env";

import { getSupabaseConfigStatus } from "../../lib/supabase/config";
import { createServiceRoleSupabaseClient } from "../../lib/supabase/service-role";

const expectedTables = [
  "creators",
  "sources",
  "audience_members",
  "interactions",
  "unresolved_questions",
  "creator_events",
  "creator_actions",
  "follow_up_mind_reasoning",
  "youtube_connections",
  "discord_connections",
  "discord_onboarding_settings",
  "discord_onboarding_receipts",
] as const;

async function main(): Promise<void> {
  const config = getSupabaseConfigStatus();
  console.log("Memora Supabase doctor");
  console.log(`public config: ${config.missingPublic.length === 0 ? "configured" : "missing"}`);
  console.log(`service role: ${config.serviceRoleConfigured ? "configured" : "missing"}`);

  if (config.missingPublic.length > 0 || !config.serviceRoleConfigured) {
    console.error("Doctor stopped before network access. Configure Supabase public variables and SUPABASE_SERVICE_ROLE_KEY.");
    process.exitCode = 1;
    return;
  }

  if (!config.developmentAccessEnabled) {
    console.error("Doctor stopped before network access. Set MEMORA_DEV_DB_ACCESS=service_role.");
    process.exitCode = 1;
    return;
  }

  try {
    const client = createServiceRoleSupabaseClient();
    let failed = false;

    for (const table of expectedTables) {
      const { error } = await client.from(table).select("id", { head: true, count: "exact" });
      const status = error ? "missing/error" : "ok";
      console.log(`table ${table}: ${status}`);
      if (error) {
        console.error(`  ${error.message}`);
        failed = true;
      }
    }

    const { data: demoCreator, error: creatorError } = await client
      .from("creators")
      .select("id, display_name, slug")
      .eq("slug", "memora-demo")
      .maybeSingle();
    if (creatorError) {
      console.error(`demo creator: error: ${creatorError.message}`);
      failed = true;
    } else {
      console.log(`demo creator: ${demoCreator ? "found" : "not seeded"}`);
    }

    if (failed) process.exitCode = 1;
  } catch (error) {
    console.error(`Doctor failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}

void main();
