import assert from "node:assert/strict";
import test from "node:test";

import { requiresWorkspaceChoice, shouldShowMyWorkspaceOnboarding, workspacePath } from "../../lib/workspaces/entry";

test("anonymous visitors choose a workspace before entering the app", () => {
  assert.equal(
    requiresWorkspaceChoice({ accessConfigured: true, mode: "mine", route: "entry", user: null }),
    true,
  );
});

test("an explicit demo selection bypasses the anonymous choice screen", () => {
  assert.equal(
    requiresWorkspaceChoice({ accessConfigured: true, mode: "demo", route: "demo", user: null }),
    false,
  );
});

test("the anonymous entry route stays a choice even before data access is configured", () => {
  assert.equal(
    requiresWorkspaceChoice({ accessConfigured: false, mode: "mine", route: "entry", user: null }),
    true,
  );
});

test("workspace links stay inside the explicit workspace route", () => {
  assert.equal(workspacePath("demo", "/app"), "/app/demo");
  assert.equal(workspacePath("demo", "/app/follow-up"), "/app/demo/follow-up");
  assert.equal(workspacePath("demo", "/app/import"), "/app/demo/import");
  assert.equal(workspacePath("demo", "/app/proof"), "/app/demo/proof");
  assert.equal(workspacePath("demo", "/app/queue"), "/app/demo/queue");
  assert.equal(workspacePath("mine", "/app/import"), "/app/my/import");
  assert.equal(workspacePath("mine", "/app/proof"), "/app/my/proof");
  assert.equal(workspacePath("mine", "/app/queue"), "/app/my/queue");
});

test("personal onboarding only appears for an empty personal workspace", () => {
  const emptyCounts = { interactions: 0, openQuestions: 0, audienceMembers: 0, creatorEvents: 0 };

  assert.equal(shouldShowMyWorkspaceOnboarding("mine", emptyCounts), true);
  assert.equal(shouldShowMyWorkspaceOnboarding("demo", emptyCounts), false);
  assert.equal(shouldShowMyWorkspaceOnboarding("mine", { ...emptyCounts, interactions: 1 }), false);
});
