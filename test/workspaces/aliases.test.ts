import assert from "node:assert/strict";
import test from "node:test";

import { getCreatorMindAlias, getWorkspaceMindAlias } from "../../lib/workspaces/aliases";

test("personal workspaces use a workspace-specific Mind alias", () => {
  assert.equal(
    getWorkspaceMindAlias({ id: "workspace-123", is_demo: false }),
    "memora-workspace-workspace-123",
  );
  assert.equal(
    getCreatorMindAlias({ slug: "my-creator", workspace_id: "workspace-123" }),
    "memora-workspace-workspace-123",
  );
});

test("the public demo always uses the dedicated Mind alias", () => {
  assert.equal(
    getWorkspaceMindAlias({ id: "demo-id", is_demo: true }),
    "memora-demo-main",
  );
  assert.equal(
    getCreatorMindAlias({ slug: "memora-demo", workspace_id: "demo-id" }),
    "memora-demo-main",
  );
});
