import assert from "node:assert/strict";
import test from "node:test";

import {
  getMindsConfigStatus,
  readMindsConfig,
} from "../../lib/minds/config";

test("Minds config requires the Builder key and configured Mind ID", () => {
  assert.throws(
    () => readMindsConfig({}),
    /MINDS_BUILDER_API_KEY, MEMORA_MIND_ID/,
  );
});

test("Minds config returns the explicit Mind ID and default alias", () => {
  const config = readMindsConfig({
    MINDS_BUILDER_API_KEY: "test-key",
    MEMORA_MIND_ID: "mind-123",
  });

  assert.deepEqual(config, {
    builderApiKey: "test-key",
    mindId: "mind-123",
    alias: "memora-main",
  });
});

test("config status never includes the Builder API key", () => {
  const status = getMindsConfigStatus({
    MINDS_BUILDER_API_KEY: "secret-test-key",
    MEMORA_MIND_ID: "mind-123",
    MEMORA_MIND_ALIAS: "creator-memory",
  });

  assert.deepEqual(status, {
    apiKeyConfigured: true,
    mindIdConfigured: true,
    configuredMindId: "mind-123",
    alias: "creator-memory",
    missing: [],
    ready: true,
  });
  assert.equal(JSON.stringify(status).includes("secret-test-key"), false);
});
