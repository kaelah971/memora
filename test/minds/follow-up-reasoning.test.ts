import assert from "node:assert/strict";
import test from "node:test";

import type { FollowUpOpportunity } from "../../lib/data/follow-up-builder";
import {
  buildFollowUpReasoningPrompt,
  findReasoningOpportunity,
  parseMindReasoningResponse,
} from "../../lib/minds/follow-up-reasoning";
import { MindsIntegrationError } from "../../lib/minds/errors";

function opportunity(overrides: Partial<FollowUpOpportunity> = {}): FollowUpOpportunity {
  return {
    id: "follow-up:interaction-1:event-1",
    audienceMemberId: "member-1",
    audienceMemberName: "Alex",
    interactionId: "interaction-1",
    commentText: "What software should beginners use?",
    commentPublishedAt: "2026-08-24T10:00:00.000Z",
    sourceId: "source-1",
    sourceTitle: "Beginner Editing Workflow",
    sourceVideoId: null,
    sourceDescription: "A stored description about beginner editing.",
    sourceUrl: "https://www.youtube.com/watch?v=video-1",
    sourcePlatform: "youtube",
    creatorEventId: "event-1",
    creatorEventTitle: "A New Beginner Workflow",
    creatorEventDescription: "A new video about software and workflow.",
    creatorEventOccurredAt: "2026-08-25T10:00:00.000Z",
    creatorEventSourceTitle: "A New Beginner Workflow",
    creatorEventSourceUrl: "https://www.youtube.com/watch?v=video-1",
    creatorEventVideoId: null,
    creatorEventVideoUrl: null,
    whyNow: "The new video shares the earlier software topic.",
    suggestedReply: "Hey Alex, this new workflow video may help.",
    confidenceLabel: "Strong evidence",
    status: "needs_review",
    replyStatus: "draft_only",
    postedReply: null,
    mindReasoning: null,
    dataOrigin: "real-youtube",
    proof: {
      sourceComment: "What software should beginners use?",
      rememberedContext: "Alex asked about software.",
      newContent: "A New Beginner Workflow",
      followUpReason: "The new video shares the earlier software topic.",
      mindsContinuity: {
        available: true,
        label: "Minds continuity verified in script proof",
        runId: "run-1",
        conversationId: "conversation-1",
        detail: "Verified script proof.",
      },
    },
    ...overrides,
  };
}

test("reasoning prompt contains only server-resolved facts and safety instructions", () => {
  const prompt = buildFollowUpReasoningPrompt(opportunity({ commentText: "What software should beginners use?" }));

  assert.match(prompt, /Audience member: "Alex"/);
  assert.match(prompt, /Original comment: "What software should beginners use\?"/);
  assert.match(prompt, /Source video: "Beginner Editing Workflow"/);
  assert.match(prompt, /New creator event: "A New Beginner Workflow"/);
  assert.match(prompt, /Existing draft:/);
  assert.match(prompt, /Return exactly these labeled sections/);
  assert.match(prompt, /FAN_QUESTION:/);
  assert.match(prompt, /ATTACHED_VIDEO_STATUS:/);
  assert.match(prompt, /Never invent a URL/);
  assert.match(prompt, /source video is where the fan commented, not the follow-up video/i);
  assert.match(prompt, /different verified video ID/i);
  assert.match(prompt, /Do not invent unseen history/);
  assert.match(prompt, /Memora never posts without creator approval and final confirmation/);
  assert.match(prompt, /No posted reply proof exists/);
  assert.doesNotMatch(prompt, /MINDS_BUILDER_API_KEY|SUPABASE_SERVICE_ROLE_KEY|refresh_token/i);
});

test("reasoning prompt includes the persisted creator voice without exposing secrets", () => {
  const prompt = buildFollowUpReasoningPrompt(opportunity(), "beginner-friendly");

  assert.match(prompt, /Creator voice preference: beginner-friendly/);
  assert.doesNotMatch(prompt, /MINDS_BUILDER_API_KEY|SUPABASE_SERVICE_ROLE_KEY|refresh_token|discord-secret/i);
});

test("reasoning opportunity lookup accepts identifiers but never client-supplied facts", () => {
  const current = opportunity();

  assert.equal(findReasoningOpportunity([current], current.id, current.interactionId), current);
  assert.equal(findReasoningOpportunity([current], current.id, "different-interaction"), null);
});

test("Mind response parsing saves reasoning, tone, and optional variants", () => {
  const parsed = parseMindReasoningResponse(
    [
      "<p><b>WHY</b>: Alex asked a clear software question.</p>",
      "<p><b>CONTEXT</b>: The original question is still open.</p>",
      "<p><b>TIMING</b>: The new workflow video shares the same beginner topic.</p>",
      "<p><b>TONE</b>: Warm and practical</p>",
      "<p><b>WARM</b>: Hey Alex, this new workflow may help.</p>",
      "<p><b>SHORT</b>: This workflow video may help.</p>",
      "<p><b>BEGINNER_FRIENDLY</b>: Start with the simplest workflow in this video.</p>",
    ].join("\n"),
    false,
  );

  assert.match(parsed.reasoningText, /Why this viewer: Alex asked/);
  assert.equal(parsed.tone, "Warm and practical");
  assert.equal(parsed.variants.warm, "Hey Alex, this new workflow may help.");
  assert.equal(parsed.variants.short, "This workflow video may help.");
  assert.equal(parsed.variants.beginnerFriendly, "Start with the simplest workflow in this video.");
  assert.deepEqual(parsed.advisory, {
    fanQuestion: null,
    sourceContext: null,
    likelyNeed: null,
    recommendedAction: null,
    replyNow: null,
    followUpOutline: null,
    attachedVideoStatus: null,
  });
});

test("Mind response parsing returns the creator advisory sections and removes untrusted links", () => {
  const trustedUrl = "https://www.youtube.com/watch?v=abcDEF12345";
  const parsed = parseMindReasoningResponse(
    [
      "FAN_QUESTION: What software should beginners use?",
      "SOURCE_CONTEXT: The stored source description covers a beginner workflow.",
      "LIKELY_NEED: A practical first step, not a broad tool list.",
      "RECOMMENDED_ACTION: Reply now with one concrete starting point.",
      `REPLY_NOW: Start here: https://example.com/fake and ${trustedUrl}`,
      "FOLLOW_UP_OUTLINE: Make a short walkthrough comparing the first two steps.",
      "ATTACHED_VIDEO_STATUS: A verified video is attached.",
      "TONE: Warm and practical",
    ].join("\n"),
    false,
    trustedUrl,
  );

  assert.equal(parsed.advisory.fanQuestion, "What software should beginners use?");
  assert.equal(parsed.advisory.recommendedAction, "Reply now with one concrete starting point.");
  assert.equal(parsed.advisory.replyNow, `Start here: and ${trustedUrl}`);
  assert.equal(parsed.advisory.followUpOutline, "Make a short walkthrough comparing the first two steps.");
  assert.equal(parsed.advisory.attachedVideoStatus, "A verified video is attached.");
});

test("Mind output cannot claim an unproven posted reply", () => {
  assert.throws(
    () => parseMindReasoningResponse("WHY: The reply was posted successfully.", false),
    (error: unknown) => error instanceof MindsIntegrationError && error.code === "API",
  );
  assert.doesNotThrow(() => parseMindReasoningResponse("WHY: The reply was posted successfully.", true));
});

test("variant parsing ignores unrelated trailing conversation text", () => {
  const parsed = parseMindReasoningResponse(
    "BEGINNER_FRIENDLY: Start with the simplest workflow.\n@another-viewer - unrelated prior context",
    false,
  );

  assert.equal(parsed.variants.beginnerFriendly, "Start with the simplest workflow.");
});
