import assert from "node:assert/strict";
import test from "node:test";

import { requiresWorkspaceChoice } from "../../lib/workspaces/entry";

test("anonymous visitors choose a workspace before entering the app", () => {
  assert.equal(
    requiresWorkspaceChoice({ accessConfigured: true, mode: "mine", user: null }),
    true,
  );
});

test("an explicit demo selection bypasses the anonymous choice screen", () => {
  assert.equal(
    requiresWorkspaceChoice({ accessConfigured: true, mode: "demo", user: null }),
    false,
  );
});

test("missing workspace access shows setup instead of a misleading choice", () => {
  assert.equal(
    requiresWorkspaceChoice({ accessConfigured: false, mode: "mine", user: null }),
    false,
  );
});
