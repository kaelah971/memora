import "../load-env";

import { assertDevelopmentServiceRoleAccess } from "../../lib/supabase/config";
import { seedDemoData } from "../../lib/data/demo-seed";
import { createServiceRoleSupabaseClient } from "../../lib/supabase/service-role";

async function main(): Promise<void> {
  try {
    assertDevelopmentServiceRoleAccess();
    const client = createServiceRoleSupabaseClient();
    const summary = await seedDemoData(client);
    console.log("Memora demo seed complete. Existing demo IDs were upserted safely.");
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(`Demo seed failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}

void main();
