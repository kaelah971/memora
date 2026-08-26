import assert from "node:assert/strict";
import test from "node:test";

import {
  createSpikeEvents,
  serializeAudienceEvent,
  serializeCreatorEvent,
} from "../../lib/minds/events";

test("audience event serialization keeps the structured fields explicit", () => {
  const payload = serializeAudienceEvent({
    eventType: "LIVESTREAM_MESSAGE",
    viewerId: "demo-alex",
    viewerName: "Alex",
    source: "YouTube Live",
    sourceDate: "2026-08-03",
    message: "What editing software should beginners use?",
    creatorReplied: false,
    relationshipState: "OPEN_QUESTION",
  });

  assert.match(payload, /^MEMORA AUDIENCE EVENT/m);
  assert.match(payload, /viewer_id: demo-alex/);
  assert.match(payload, /creator_replied: false/);
  assert.match(payload, /relationship_state: OPEN_QUESTION/);
  assert.match(payload, /Do not invent facts/);
  assert.equal(payload.includes("\n", payload.indexOf("message: ")), true);
});

test("creator event serialization asks for reasoning from earlier context", () => {
  const payload = serializeCreatorEvent({
    eventType: "NEW_CONTENT",
    title: "My Beginner Editing Workflow",
    publishedDate: "2026-08-23",
    topic: "beginner editing software and workflow",
  });

  assert.match(payload, /^MEMORA CREATOR EVENT/m);
  assert.match(payload, /title: My Beginner Editing Workflow/);
  assert.match(payload, /earlier interactions/);
  assert.match(payload, /suggested creator action/);
});

test("event values cannot inject additional structured lines", () => {
  const payload = serializeAudienceEvent({
    eventType: "LIVESTREAM_MESSAGE",
    viewerId: "demo\nforged: true",
    viewerName: "Alex",
    source: "YouTube Live",
    sourceDate: "2026-08-03",
    message: "A question",
    creatorReplied: false,
    relationshipState: "OPEN_QUESTION",
  });

  assert.equal(payload.includes("viewer_id: demo forged: true"), true);
  assert.equal(payload.includes("\nforged: true"), false);
});

test("spike events use a unique run identifier in every fixture identity", () => {
  const runId = "memora-spike-test-run";
  const { audience, creator } = createSpikeEvents(runId);
  const audiencePayload = serializeAudienceEvent(audience);
  const creatorPayload = serializeCreatorEvent(creator);

  assert.match(audiencePayload, new RegExp(`run_id: ${runId}`));
  assert.match(audiencePayload, new RegExp(`event_id: ${runId}-audience-event-1`));
  assert.match(audiencePayload, new RegExp(`source_id: ${runId}-youtube-live`));
  assert.match(audiencePayload, new RegExp(`message: .*${runId}`));
  assert.match(creatorPayload, new RegExp(`run_id: ${runId}`));
  assert.match(creatorPayload, new RegExp(`event_id: ${runId}-creator-event-2`));
  assert.match(creatorPayload, new RegExp(`source_id: ${runId}-youtube-video`));
});
