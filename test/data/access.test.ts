import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getProductionWorkspaceAccessBlock } from "../../lib/data/access-policy";
import {
  getSupabaseConfigStatus,
  readSupabasePublicConfig,
  readSupabaseWorkerConfig,
} from "../../lib/supabase/config";
import { getTrustedYouTubeClient } from "../../lib/youtube/storage";

const productionEnvironment = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

test("production without the demo gate blocks the deterministic workspace", () => {
  const accessBlock = getProductionWorkspaceAccessBlock({
    ...productionEnvironment,
    MEMORA_DEMO_WORKSPACE_ACCESS: "disabled",
  });

  assert.equal(accessBlock?.available, false);
  assert.match(accessBlock?.reason ?? "", /MEMORA_DEMO_WORKSPACE_ACCESS=enabled/);
  assert.throws(
    () => getTrustedYouTubeClient({ ...productionEnvironment, MEMORA_DEMO_WORKSPACE_ACCESS: "disabled" }),
    /MEMORA_DEMO_WORKSPACE_ACCESS=enabled/,
  );
});

test("production demo gate allows server-side Supabase workspace access", () => {
  const environment = {
    ...productionEnvironment,
    MEMORA_DEMO_WORKSPACE_ACCESS: "enabled",
  };
  const youtubeClient = getTrustedYouTubeClient(environment);

  assert.equal(getProductionWorkspaceAccessBlock(environment), null);
  assert.ok(youtubeClient);
  assert.equal(getSupabaseConfigStatus(environment).demoWorkspaceAccessEnabled, true);
});

test("the Discord worker only requires Supabase URL and service-role credentials", () => {
  const workerConfig = readSupabaseWorkerConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://worker.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "worker-service-role-key",
  });

  assert.deepEqual(workerConfig, {
    url: "https://worker.supabase.co",
    serviceRoleKey: "worker-service-role-key",
  });
  assert.throws(
    () => readSupabaseWorkerConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://worker.supabase.co" }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  );
});

test("the service-role key remains server-only and public config excludes it", () => {
  const publicConfig = readSupabasePublicConfig(productionEnvironment);
  assert.deepEqual(publicConfig, {
    url: productionEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: productionEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  assert.equal("serviceRoleKey" in publicConfig, false);

  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const browserSource = readFileSync(path.join(projectRoot, "lib", "supabase", "browser.ts"), "utf8");
  const dataAccessSource = readFileSync(path.join(projectRoot, "lib", "data", "access.ts"), "utf8");
  const adminSource = readFileSync(path.join(projectRoot, "lib", "supabase", "admin.ts"), "utf8");

  assert.doesNotMatch(browserSource, /SUPABASE_SERVICE_ROLE_KEY|serviceRoleKey/);
  assert.match(dataAccessSource, /import ["']server-only["']/);
  assert.match(adminSource, /import ["']server-only["']/);
});
