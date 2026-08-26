import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_IDS } from "../../lib/data/demo-seed";

test("demo seed identifiers are stable and unique", () => {
  const ids = Object.values(DEMO_IDS);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[0-9a-f-]{36}$/.test(id)));
});
