import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

test("Discord listener entrypoint loads in Node without server-only", () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const entrypoint = pathToFileURL(path.join(projectRoot, "scripts", "discord", "listener.ts")).href;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx/esm", "--eval", `import(${JSON.stringify(entrypoint)})`],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        DISCORD_BOT_TOKEN: "",
        DISCORD_GUILD_ID: "",
        DISCORD_MONITORED_CHANNEL_IDS: "",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        MEMORA_DEV_DB_ACCESS: "",
      },
    },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert.equal(result.error, undefined);
  assert.match(output, /Discord listener could not start/);
  assert.doesNotMatch(output, /cannot be imported from a Client Component|server-only/i);
});
