import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CREATOR_VOICE,
  isCreatorVoice,
  normalizeCreatorVoice,
} from "../../types/data";

test("creator voice defaults safely and accepts only the supported preferences", () => {
  assert.equal(DEFAULT_CREATOR_VOICE, "warm");
  assert.equal(normalizeCreatorVoice(undefined), "warm");
  assert.equal(normalizeCreatorVoice("beginner-friendly"), "beginner-friendly");
  assert.equal(isCreatorVoice("professional"), true);
  assert.equal(isCreatorVoice("secret-token"), false);
  assert.equal(JSON.stringify(normalizeCreatorVoice("secret-token")).includes("token"), false);
});
