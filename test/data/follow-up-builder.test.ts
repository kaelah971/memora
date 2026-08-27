import assert from "node:assert/strict";
import test from "node:test";

import type { Tables } from "../../lib/supabase/database.types";
import {
  buildFollowUpOpportunities,
  extractYouTubeVideoId,
  getFollowUpReplyVariants,
  followUpOpportunityAnchor,
  getCreatorEventYouTubeVideoUrl,
  getFollowUpActionVisibility,
} from "../../lib/data/follow-up-builder";

function source(overrides: Partial<Tables<"sources">> = {}): Tables<"sources"> {
  return {
    id: "source-1",
    creator_id: "creator-1",
    platform: "youtube_live",
    source_type: "livestream",
    external_id: "source-external-1",
    title: "Creator Q&A Livestream",
    url: null,
    published_at: "2026-08-03T20:00:00.000Z",
    imported_at: "2026-08-03T20:01:00.000Z",
    metadata: { demo: true },
    created_at: "2026-08-03T20:01:00.000Z",
    updated_at: "2026-08-03T20:01:00.000Z",
    ...overrides,
  };
}

function dataset(overrides: {
  source?: Tables<"sources">;
  interaction?: Tables<"interactions">;
  event?: Tables<"creator_events">;
  question?: Tables<"unresolved_questions">;
  action?: Tables<"creator_actions">;
} = {}) {
  const currentSource = overrides.source ?? source();
  const interaction: Tables<"interactions"> = overrides.interaction ?? {
    id: "interaction-1",
    creator_id: "creator-1",
    audience_member_id: "member-1",
    source_id: currentSource.id,
    platform: currentSource.platform,
    interaction_type: "livestream_message",
    external_id: "interaction-external-1",
    text: "What editing software should beginners use?",
    published_at: "2026-08-03T20:42:18.000Z",
    creator_replied: false,
    parent_interaction_id: null,
    like_count: null,
    reply_count: null,
    raw_metadata: { demo: true },
    created_at: "2026-08-03T20:42:18.000Z",
    updated_at: "2026-08-03T20:42:18.000Z",
  };
  const event: Tables<"creator_events"> = overrides.event ?? {
    id: "event-1",
    creator_id: "creator-1",
    event_type: "content_published",
    source_id: "source-event-1",
    external_id: "event-external-1",
    title: "My Beginner Editing Workflow",
    description: "A new video about beginner editing software and workflow.",
    occurred_at: "2026-08-23T10:00:00.000Z",
    payload: { demo: true, topic: "beginner editing software and workflow" },
    processed_for_followups_at: null,
    created_at: "2026-08-23T10:00:00.000Z",
    updated_at: "2026-08-23T10:00:00.000Z",
  };
  const eventSource = source({
    id: event.source_id ?? "source-event-1",
    platform: "manual",
    source_type: "demo_dataset",
    title: event.title,
    metadata: { demo: true, event_only: true },
  });
  const member: Tables<"audience_members"> = {
    id: "member-1",
    creator_id: "creator-1",
    platform: currentSource.platform,
    platform_user_id: "viewer-1",
    display_name: "Alex",
    avatar_url: null,
    first_seen_at: interaction.published_at,
    last_seen_at: interaction.published_at,
    created_at: interaction.published_at,
    updated_at: interaction.published_at,
  };
  const question: Tables<"unresolved_questions"> = overrides.question ?? {
    id: "question-1",
    creator_id: "creator-1",
    audience_member_id: member.id,
    interaction_id: interaction.id,
    question_text: interaction.text,
    status: "open",
    resolution_type: null,
    resolved_by_interaction_id: null,
    resolved_at: null,
    dismissed_at: null,
    created_at: interaction.published_at,
    updated_at: interaction.published_at,
  };

  return {
    members: [member],
    interactions: [interaction],
    sources: [currentSource, eventSource],
    questions: [question],
    creatorEvents: [event],
    creatorActions: overrides.action ? [overrides.action] : [],
    mindReasoning: [],
  };
}

test("opportunity builder creates a demo fallback opportunity", () => {
  const [opportunity] = buildFollowUpOpportunities({
    ...dataset(),
    dataOrigin: "demo-seed-fallback",
  });

  assert.ok(opportunity);
  assert.equal(opportunity.dataOrigin, "demo-seed-fallback");
  assert.equal(opportunity.audienceMemberName, "Alex");
  assert.equal(opportunity.creatorEventTitle, "My Beginner Editing Workflow");
  assert.equal(opportunity.creatorEventVideoUrl, null);
  assert.doesNotMatch(opportunity.suggestedReply, /youtube\.com|youtu\.be|watch\?v=/i);
  assert.match(opportunity.suggestedReply, /make a simpler beginner walkthrough .* once it's live/i);
  assert.match(opportunity.whyNow, /create the beginner walkthrough first/i);
});

test("queue links target the matching follow-up detail anchor", () => {
  assert.equal(
    followUpOpportunityAnchor("follow-up:interaction-1:event-1"),
    "follow-up-opportunity-follow-up-interaction-1-event-1",
  );
});

test("imported YouTube records are preferred and proof fields are complete", () => {
  const importedSource = source({
    platform: "youtube",
    source_type: "video",
    title: "Beginner Editing Workflow",
    url: "https://www.youtube.com/watch?v=abcDEF12345",
    metadata: { youtube_channel_id: "real-channel", description: "A stored source description." },
  });
  const importedEventSource = source({
    id: "source-event-1",
    platform: "youtube",
    source_type: "video",
    title: "Beginner Editing Workflow",
    url: "https://www.youtube.com/watch?v=ZYXwv987654",
    metadata: { youtube_channel_id: "real-channel" },
  });
  const input = dataset({
    source: importedSource,
    event: {
      ...dataset().creatorEvents[0],
      source_id: importedEventSource.id,
      payload: { platform: "youtube", topic: "beginner editing software and workflow", video_id: "ZYXwv987654" },
    },
    interaction: {
      ...dataset().interactions[0],
      platform: "youtube",
      raw_metadata: { comment_id: "real-comment" },
    },
  });
  input.sources = [importedSource, importedEventSource];

  const [opportunity] = buildFollowUpOpportunities(input);

  assert.ok(opportunity);
  assert.equal(opportunity.dataOrigin, "real-youtube");
  assert.equal(opportunity.sourceDescription, "A stored source description.");
  assert.equal(opportunity.sourceVideoId, "abcDEF12345");
  assert.equal(opportunity.creatorEventVideoId, "ZYXwv987654");
  assert.equal(opportunity.creatorEventVideoUrl, "https://www.youtube.com/watch?v=ZYXwv987654");
  assert.match(opportunity.suggestedReply, /ZYXwv987654/);
  assert.equal(opportunity.proof.sourceComment, opportunity.commentText);
  assert.ok(opportunity.proof.rememberedContext);
  assert.ok(opportunity.proof.newContent);
  assert.ok(opportunity.proof.followUpReason);
  assert.equal(opportunity.proof.mindsContinuity.available, true);
});

test("reply variants use only the verified follow-up video or no link", () => {
  const importedSource = source({
    platform: "youtube",
    source_type: "video",
    url: "https://www.youtube.com/watch?v=abcDEF12345",
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: "abcDEF12345" },
  });
  const importedEventSource = source({
    id: "source-event-1",
    platform: "youtube",
    source_type: "video",
    url: "https://www.youtube.com/watch?v=ZYXwv987654",
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: "ZYXwv987654" },
  });
  const imported = dataset({
    source: importedSource,
    event: {
      ...dataset().creatorEvents[0],
      source_id: importedEventSource.id,
      payload: { platform: "youtube", topic: "beginner editing software and workflow", video_id: "ZYXwv987654" },
    },
    interaction: {
      ...dataset().interactions[0],
      platform: "youtube",
      raw_metadata: { comment_id: "real-comment", video_id: "abcDEF12345" },
    },
  });
  imported.sources = [importedSource, importedEventSource];
  const [withVideo] = buildFollowUpOpportunities(imported);
  assert.ok(withVideo);
  const linkedVariants = getFollowUpReplyVariants(withVideo);
  for (const reply of Object.values(linkedVariants)) {
    assert.match(reply, /https:\/\/www\.youtube\.com\/watch\?v=ZYXwv987654/);
    assert.doesNotMatch(reply, /abcDEF12345/);
  }

  const [withoutVideo] = buildFollowUpOpportunities({ ...dataset(), dataOrigin: "demo-seed-fallback" });
  assert.ok(withoutVideo);
  for (const reply of Object.values(getFollowUpReplyVariants(withoutVideo))) {
    assert.doesNotMatch(reply, /https?:\/\/|youtube\.com|youtu\.be/i);
  }
});

test("content-first creator action status is visible until a later video is attached", () => {
  const input = dataset({
    action: {
      id: "content-action-1",
      creator_id: "creator-1",
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
      action_type: "follow_up",
      status: "pending",
      text: null,
      created_at: "2026-08-25T10:00:00.000Z",
      completed_at: null,
      metadata: { follow_up_status: "needs_follow_up_content" },
    },
  });
  const [withoutVideo] = buildFollowUpOpportunities({ ...input, dataOrigin: "demo-seed-fallback" });
  assert.equal(withoutVideo.status, "needs_follow_up_content");

  const sourceWithVideo = source({
    id: "source-event-1",
    platform: "youtube",
    source_type: "video",
    url: "https://www.youtube.com/watch?v=ZYXwv987654",
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: "ZYXwv987654" },
  });
  const realSource = source({
    platform: "youtube",
    source_type: "video",
    url: "https://www.youtube.com/watch?v=abcDEF12345",
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: "abcDEF12345" },
  });
  const withVideo = {
    ...input,
    sources: [realSource, sourceWithVideo],
    interactions: [{ ...input.interactions[0], source_id: realSource.id, platform: "youtube" as const, raw_metadata: { comment_id: "real-comment", video_id: "abcDEF12345" } }],
    creatorEvents: [{ ...input.creatorEvents[0], source_id: sourceWithVideo.id, payload: { video_id: "ZYXwv987654", topic: "beginner editing software" } }],
  };
  const [later] = buildFollowUpOpportunities({ ...withVideo, dataOrigin: "real-youtube" });
  assert.equal(later.status, "needs_review");
  assert.equal(later.creatorEventVideoId, "ZYXwv987654");
});

test("the original source video never becomes the follow-up video", () => {
  const originalVideoId = "abcDEF12345";
  const importedSource = source({
    platform: "youtube",
    source_type: "video",
    external_id: originalVideoId,
    url: `https://www.youtube.com/watch?v=${originalVideoId}`,
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: originalVideoId },
  });
  const input = dataset({
    source: importedSource,
    interaction: {
      ...dataset().interactions[0],
      source_id: importedSource.id,
      platform: "youtube",
      raw_metadata: { comment_id: "real-comment", video_id: originalVideoId },
    },
    event: {
      ...dataset().creatorEvents[0],
      source_id: importedSource.id,
      external_id: originalVideoId,
      payload: { platform: "youtube", video_id: originalVideoId, topic: "beginner editing software and workflow" },
    },
  });
  input.sources = [importedSource];

  const [opportunity] = buildFollowUpOpportunities(input);

  assert.ok(opportunity);
  assert.equal(opportunity.sourceVideoId, originalVideoId);
  assert.equal(opportunity.creatorEventVideoId, null);
  assert.equal(opportunity.creatorEventVideoUrl, null);
  assert.match(opportunity.whyNow, /create the beginner walkthrough first/i);
  assert.doesNotMatch(opportunity.suggestedReply, new RegExp(originalVideoId));
});

test("a later separate matching event wins over the original source event", () => {
  const originalVideoId = "abcDEF12345";
  const laterVideoId = "ZYXwv987654";
  const originalSource = source({
    id: "original-source",
    platform: "youtube",
    source_type: "video",
    external_id: originalVideoId,
    url: `https://www.youtube.com/watch?v=${originalVideoId}`,
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: originalVideoId },
  });
  const laterSource = source({
    id: "later-source",
    platform: "youtube",
    source_type: "video",
    external_id: laterVideoId,
    url: `https://www.youtube.com/watch?v=${laterVideoId}`,
    metadata: { youtube_channel_id: "real-channel", youtube_video_id: laterVideoId },
  });
  const current = dataset({
    source: originalSource,
    interaction: {
      ...dataset().interactions[0],
      source_id: originalSource.id,
      platform: "youtube",
      raw_metadata: { video_id: originalVideoId },
    },
    event: {
      ...dataset().creatorEvents[0],
      id: "original-event",
      source_id: originalSource.id,
      external_id: originalVideoId,
      payload: { platform: "youtube", video_id: originalVideoId, topic: "beginner editing software and workflow" },
    },
  });
  current.sources = [originalSource, laterSource];
  current.creatorEvents.push({
    ...current.creatorEvents[0],
    id: "later-event",
    source_id: laterSource.id,
    external_id: laterVideoId,
    title: "A simpler beginner editing workflow",
    payload: { platform: "youtube", video_id: laterVideoId, topic: "beginner editing software and workflow" },
    occurred_at: "2026-08-24T10:00:00.000Z",
  });

  const [opportunity] = buildFollowUpOpportunities(current);

  assert.ok(opportunity);
  assert.equal(opportunity.creatorEventId, "later-event");
  assert.equal(opportunity.creatorEventVideoId, laterVideoId);
  assert.equal(opportunity.creatorEventVideoUrl, `https://www.youtube.com/watch?v=${laterVideoId}`);
  assert.match(opportunity.suggestedReply, new RegExp(laterVideoId));
  assert.doesNotMatch(opportunity.suggestedReply, new RegExp(originalVideoId));
  assert.match(opportunity.whyNow, /reply with the follow-up video/i);
});

test("creator events from another workspace cannot become follow-up matches", () => {
  const current = dataset();
  const workspaceSource = source({
    platform: "youtube",
    source_type: "video",
    external_id: "abcDEF12345",
    url: "https://www.youtube.com/watch?v=abcDEF12345",
    metadata: { youtube_channel_id: "workspace-channel" },
    workspace_id: "workspace-1",
  });
  const otherWorkspaceSource = source({
    id: "other-workspace-source",
    platform: "youtube",
    source_type: "video",
    external_id: "ZYXwv987654",
    url: "https://www.youtube.com/watch?v=ZYXwv987654",
    metadata: { youtube_channel_id: "workspace-channel" },
    workspace_id: "workspace-2",
  });
  const input = {
    ...current,
    workspaceId: "workspace-1",
    members: current.members.map((member) => ({ ...member, workspace_id: "workspace-1" })),
    interactions: current.interactions.map((interaction) => ({
      ...interaction,
      source_id: workspaceSource.id,
      platform: "youtube" as const,
      workspace_id: "workspace-1",
      raw_metadata: { video_id: "abcDEF12345" },
    })),
    sources: [workspaceSource, otherWorkspaceSource],
    questions: current.questions.map((question) => ({ ...question, workspace_id: "workspace-1" })),
    creatorEvents: current.creatorEvents.map((event) => ({
      ...event,
      source_id: otherWorkspaceSource.id,
      workspace_id: "workspace-2",
      payload: { platform: "youtube", video_id: "ZYXwv987654", topic: "editing software" },
    })),
    creatorActions: [],
  };

  assert.deepEqual(buildFollowUpOpportunities(input), []);
});

test("follow-up video links require a real YouTube video ID from the matching event", () => {
  const current = dataset();
  const event = current.creatorEvents[0];
  const eventSource = current.sources.find((item) => item.id === event.source_id);

  assert.equal(extractYouTubeVideoId("https://youtu.be/abcDEF12345?t=30"), "abcDEF12345");
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?v=demo-video"), null);
  assert.equal(getCreatorEventYouTubeVideoUrl(event, eventSource), null);

  const importedEventSource = source({
    id: "imported-event-source-1",
    platform: "youtube",
    source_type: "video",
    external_id: "legacy-source-id",
    url: "https://www.youtube.com/watch?v=abcDEF12345",
    metadata: { youtube_channel_id: "real-channel" },
  });
  const legacyEvent = {
    ...event,
    source_id: importedEventSource.id,
    external_id: "legacy-event-id",
    payload: { platform: "youtube" },
  };
  assert.equal(getCreatorEventYouTubeVideoUrl(legacyEvent, importedEventSource), null);
  assert.equal(
    getCreatorEventYouTubeVideoUrl(
      { ...legacyEvent, payload: { platform: "youtube", video_url: "https://youtu.be/abcDEF12345" } },
      importedEventSource,
    ),
    "https://www.youtube.com/watch?v=abcDEF12345",
  );
});

test("imported Discord records create a draft-only source-backed opportunity", () => {
  const discordSource = source({
    id: "discord-source-1",
    platform: "discord",
    source_type: "discord_channel",
    external_id: "1541890626864554110",
    title: "#creator-questions",
    url: "https://discord.com/channels/guild/1541890626864554110",
    metadata: { discord_guild_id: "guild", discord_channel_id: "1541890626864554110" },
  });
  const discordEventSource = source({
    id: "discord-source-event-1",
    platform: "discord",
    source_type: "discord_channel",
    external_id: "1541890494035136522",
    title: "#announcements",
    url: "https://discord.com/channels/guild/1541890494035136522",
    metadata: { discord_guild_id: "guild", discord_channel_id: "1541890494035136522" },
  });
  const input = dataset({
    source: discordSource,
    interaction: {
      ...dataset().interactions[0],
      source_id: discordSource.id,
      platform: "discord",
      external_id: "discord-message-1",
      raw_metadata: { discord_message_id: "discord-message-1" },
    },
    event: {
      ...dataset().creatorEvents[0],
      source_id: discordEventSource.id,
      title: "Beginner editing software workflow is live",
      description: "The beginner editing software workflow is now available.",
      payload: { discord_message_id: "discord-message-2" },
    },
  });
  input.sources = [discordSource, discordEventSource];

  const [opportunity] = buildFollowUpOpportunities(input);

  assert.ok(opportunity);
  assert.equal(opportunity.dataOrigin, "real-discord");
  assert.equal(opportunity.sourcePlatform, "discord");
  assert.equal(opportunity.replyStatus, "draft_only");
  assert.equal(opportunity.status, "needs_review");
  assert.match(opportunity.proof.sourceComment, /editing software/i);
  assert.match(opportunity.creatorEventTitle, /beginner editing software/i);
});

test("follow-up context remembers a member who received onboarding", () => {
  const input = dataset();
  input.interactions.push({
    ...input.interactions[0],
    id: "onboarding-interaction-1",
    external_id: "onboarding:receipt-1",
    creator_replied: true,
    text: "Start in #announcements, then ask questions in #creator-questions.",
    raw_metadata: { onboarding_receipt_id: "receipt-1", onboarding_status: "drafted" },
  });

  const [opportunity] = buildFollowUpOpportunities({ ...input, dataOrigin: "demo-seed-fallback" });

  assert.equal(opportunity?.onboardingContext, "This member was onboarded before and pointed to beginner resources.");
});

test("creator voice changes the deterministic draft without changing source facts", () => {
  const input = dataset();
  input.interactions[0] = {
    ...input.interactions[0],
    text: "What editing software should beginners use? https://example.com/not-a-follow-up",
  };
  const [opportunity] = buildFollowUpOpportunities({
    ...input,
    dataOrigin: "demo-seed-fallback",
    creatorVoice: "beginner-friendly",
  });

  assert.ok(opportunity);
  assert.match(opportunity.suggestedReply, /make a simple beginner walkthrough .* once it's live/i);
  assert.doesNotMatch(opportunity.suggestedReply, /example\.com/);
  assert.match(opportunity.commentText, /editing software/i);
});

test("approval and dismissal state comes from the latest creator action", () => {
  const input = dataset({
    action: {
      id: "action-1",
      creator_id: "creator-1",
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
      action_type: "follow_up",
      status: "approved",
      text: "A draft",
      created_at: "2026-08-24T10:00:00.000Z",
      completed_at: null,
      metadata: { delivery_status: "not_sent", reply_variant: "short", reply_tone: "short" },
    },
  });
  const [approved] = buildFollowUpOpportunities({ ...input, dataOrigin: "demo-seed-fallback" });
  assert.equal(approved.status, "approved");
  assert.equal(approved.selectedReplyVariant, "short");
  assert.equal(approved.selectedReply, "A draft");
  assert.equal(approved.replyStatus, "draft_only");
  assert.doesNotMatch(approved.suggestedReply, /posted|sent/i);

  const [dismissed] = buildFollowUpOpportunities({
    ...input,
    creatorActions: [{ ...input.creatorActions[0], action_type: "dismiss", status: "dismissed" }],
    dataOrigin: "demo-seed-fallback",
  });
  assert.equal(dismissed.status, "dismissed");
});

test("persisted unsafe review text never replaces the recomputed safe draft", () => {
  const input = dataset({
    action: {
      id: "unsafe-action-1",
      creator_id: "creator-1",
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
      action_type: "follow_up",
      status: "approved",
      text: "Old draft https://www.youtube.com/watch?v=_IjuW9L6C2A",
      created_at: "2026-08-26T10:00:00.000Z",
      completed_at: null,
      metadata: { delivery_status: "not_sent" },
    },
  });

  const [opportunity] = buildFollowUpOpportunities({ ...input, dataOrigin: "demo-seed-fallback" });

  assert.equal(opportunity.status, "needs_review");
  assert.doesNotMatch(opportunity.suggestedReply, /_IjuW9L6C2A|youtube\.com|watch\?v=/i);
  assert.match(opportunity.suggestedReply, /make a simpler beginner walkthrough .* once it's live/i);
});

test("posted reply proof changes the opportunity state without claiming draft-only", () => {
  const input = dataset({
    action: {
      id: "reply-1",
      creator_id: "creator-1",
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
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
        source_video_id: "video-1",
      },
    },
  });

  const [posted] = buildFollowUpOpportunities({ ...input, dataOrigin: "demo-seed-fallback" });

  assert.equal(posted.status, "posted");
  assert.equal(posted.postedReply?.youtubeReplyId, "reply-1");
  assert.equal(posted.postedReply?.parentCommentId, "comment-1");
  assert.equal(posted.replyStatus, "posted");
});

test("follow-up actions are visible only for the matching current state", () => {
  assert.deepEqual(getFollowUpActionVisibility("needs_review", false), {
    showApprove: true,
    showDismiss: true,
    showPost: false,
    showPostedProof: false,
  });
  assert.deepEqual(getFollowUpActionVisibility("dismissed", false), {
    showApprove: false,
    showDismiss: false,
    showPost: false,
    showPostedProof: false,
  });
  assert.deepEqual(getFollowUpActionVisibility("approved", false), {
    showApprove: false,
    showDismiss: false,
    showPost: true,
    showPostedProof: false,
  });
  assert.deepEqual(getFollowUpActionVisibility("posted", true), {
    showApprove: false,
    showDismiss: false,
    showPost: false,
    showPostedProof: true,
  });
});

test("review state follows interaction and event IDs even when an old opportunity ID remains in metadata", () => {
  const input = dataset({
    action: {
      id: "action-legacy-id",
      creator_id: "creator-1",
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
      action_type: "follow_up",
      status: "approved",
      text: "A draft",
      created_at: "2026-08-25T10:00:00.000Z",
      completed_at: null,
      metadata: { opportunity_id: "follow-up:old-interaction:old-event" },
    },
  });

  const [current] = buildFollowUpOpportunities({ ...input, dataOrigin: "demo-seed-fallback" });

  assert.equal(current.id, "follow-up:interaction-1:event-1");
  assert.equal(current.status, "approved");
});

test("saved Mind reasoning attaches to the deterministic opportunity and survives queue rebuilds", () => {
  const input = dataset();
  const mindReasoning = [{
    id: "mind-reasoning-1",
    creator_id: "creator-1",
    opportunity_id: "follow-up:interaction-1:event-1",
    interaction_id: "interaction-1",
    mind_id: "mind-1",
    conversation_id: "conversation-1",
    reasoning_text: "Why this viewer: the open question matches the new workflow.",
    tone: "Warm and practical",
    variants: {
      warm: "A warm variant.",
      short: "A short variant.",
      beginner_friendly: "A beginner-friendly variant.",
    },
    created_at: "2026-08-25T13:00:00.000Z",
    updated_at: "2026-08-25T13:00:00.000Z",
  }];

  const [current] = buildFollowUpOpportunities({ ...input, mindReasoning, dataOrigin: "demo-seed-fallback" });

  assert.equal(current.mindReasoning?.id, "mind-reasoning-1");
  assert.equal(current.mindReasoning?.tone, "Warm and practical");
  assert.equal(current.mindReasoning?.variants.beginnerFriendly, "A beginner-friendly variant.");
});

test("empty source data produces no opportunities", () => {
  assert.deepEqual(
    buildFollowUpOpportunities({
      members: [],
      interactions: [],
      sources: [],
      questions: [],
      creatorEvents: [],
      creatorActions: [],
    }),
    [],
  );
});
