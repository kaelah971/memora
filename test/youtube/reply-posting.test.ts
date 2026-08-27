import assert from "node:assert/strict";
import test from "node:test";

import type { Tables } from "../../lib/supabase/database.types";
import {
  evaluateReplyPostingGate,
  findReplyOpportunity,
} from "../../lib/youtube/reply-posting";
import {
  insertYouTubeReplyWithClient,
  validateYouTubeReplyText,
  YOUTUBE_REPLY_MAX_LENGTH,
  type YouTubeCommentsClient,
} from "../../lib/youtube/replies";
import { YouTubeIntegrationError } from "../../lib/youtube/errors";
import type { FollowUpOpportunity } from "../../lib/data/follow-up-builder";

function action(overrides: Partial<Tables<"creator_actions">> = {}): Tables<"creator_actions"> {
  return {
    id: "action-1",
    creator_id: "creator-1",
    audience_member_id: "member-1",
    interaction_id: "interaction-1",
    creator_event_id: "event-1",
    action_type: "follow_up",
    status: "pending",
    text: null,
    created_at: "2026-08-25T10:00:00.000Z",
    completed_at: null,
    metadata: { delivery_status: "not_sent" },
    ...overrides,
  };
}

function opportunity(status: FollowUpOpportunity["status"] = "needs_review"): FollowUpOpportunity {
  return {
    id: "follow-up:interaction-1:event-1",
    audienceMemberId: "member-1",
    audienceMemberName: "Alex",
    interactionId: "interaction-1",
    commentText: "What editing software should beginners use?",
    commentPublishedAt: "2026-08-24T10:00:00.000Z",
    sourceId: "source-1",
    sourceTitle: "Editing Workflow",
    sourceVideoId: null,
    sourceDescription: null,
    sourceUrl: "https://www.youtube.com/watch?v=video-1",
    sourcePlatform: "youtube",
    creatorEventId: "event-1",
    creatorEventTitle: "Beginner Editing Workflow",
    creatorEventDescription: "A new workflow video.",
    creatorEventOccurredAt: "2026-08-25T10:00:00.000Z",
    creatorEventSourceTitle: "Beginner Editing Workflow",
    creatorEventSourceUrl: "https://www.youtube.com/watch?v=video-1",
    creatorEventVideoId: null,
    creatorEventVideoUrl: null,
    whyNow: "The new video answers the earlier question.",
    suggestedReply: "Hey Alex, this new workflow video may help.",
    confidenceLabel: "Strong evidence",
    status,
    replyStatus: "draft_only",
    postedReply: null,
    mindReasoning: null,
    dataOrigin: "real-youtube",
    proof: {
      sourceComment: "What editing software should beginners use?",
      rememberedContext: "Alex asked about editing software.",
      newContent: "Beginner Editing Workflow",
      followUpReason: "The new video answers the earlier question.",
      mindsContinuity: {
        available: true,
        label: "Minds continuity verified in script proof",
        runId: "run-1",
        conversationId: "conversation-1",
        detail: "Verified script proof.",
      },
    },
  };
}

function approvedAction(overrides: Partial<Tables<"creator_actions">> = {}): Tables<"creator_actions"> {
  return action({ status: "approved", text: "Approved reply", ...overrides });
}

test("posting gate requires the latest creator approval and approved text", () => {
  const result = evaluateReplyPostingGate(opportunity("needs_review"), [approvedAction()]);

  assert.equal(result.allowed, true);
  assert.equal(result.approvedText, "Approved reply");

  const dismissed = evaluateReplyPostingGate(opportunity("dismissed"), [
    approvedAction(),
    action({ id: "action-2", action_type: "dismiss", status: "dismissed", created_at: "2026-08-25T11:00:00.000Z" }),
  ]);
  assert.deepEqual(dismissed, { allowed: false, code: "approval_required" });
});

test("posting gate blocks duplicate and in-progress reply actions", () => {
  const posted = evaluateReplyPostingGate(opportunity("approved"), [
    approvedAction(),
    action({
      id: "reply-1",
      action_type: "reply",
      status: "completed",
      text: "Approved reply",
      created_at: "2026-08-25T12:00:00.000Z",
      completed_at: "2026-08-25T12:01:00.000Z",
      metadata: {
        posting_status: "posted",
        opportunity_id: "follow-up:interaction-1:event-1",
        parent_comment_id: "comment-1",
        youtube_reply_id: "reply-1",
        reply_text: "Approved reply",
        posted_at: "2026-08-25T12:01:00.000Z",
        source_id: "source-1",
      },
    }),
  ]);
  assert.deepEqual(posted, { allowed: false, code: "reply_already_posted" });

  const inProgress = evaluateReplyPostingGate(opportunity("approved"), [
    approvedAction(),
    action({ id: "reply-1", action_type: "reply", status: "pending", metadata: { posting_status: "posting" } }),
  ]);
  assert.deepEqual(inProgress, { allowed: false, code: "reply_posting_in_progress" });
});

test("opportunity lookup requires all supplied identifiers to agree", () => {
  const current = opportunity("approved");

  assert.equal(findReplyOpportunity([current], current.id, current.interactionId), current);
  assert.equal(findReplyOpportunity([current], current.id, "different-interaction"), null);
  assert.equal(findReplyOpportunity([current], null, current.interactionId), current);
});

test("reply insertion uses comments.insert with the imported parent comment ID", async () => {
  const requests: unknown[] = [];
  const youtube = {
    comments: {
      insert: async (request: unknown) => {
        requests.push(request);
        return { data: { id: "reply-1" } };
      },
    },
  } as unknown as YouTubeCommentsClient;

  const result = await insertYouTubeReplyWithClient(youtube, "comment-1", "Approved reply");

  assert.deepEqual(result, {
    replyId: "reply-1",
    parentCommentId: "comment-1",
    replyText: "Approved reply",
  });
  assert.deepEqual(requests, [{
    part: ["snippet"],
    requestBody: { snippet: { parentId: "comment-1", textOriginal: "Approved reply" } },
  }]);
});

test("reply text validation trims and bounds public input", () => {
  assert.equal(validateYouTubeReplyText("  Approved reply  "), "Approved reply");
  assert.throws(() => validateYouTubeReplyText(" "), YouTubeIntegrationError);
  assert.throws(() => validateYouTubeReplyText("x".repeat(YOUTUBE_REPLY_MAX_LENGTH + 1)), YouTubeIntegrationError);
});
