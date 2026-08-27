import assert from "node:assert/strict";
import test from "node:test";

import type { Tables } from "../../lib/supabase/database.types";
import { buildJudgeProofData } from "../../lib/data/judge-proof-builder";

const creator = { id: "creator-1" } as Tables<"creators">;

function importedSource(id: string, title: string): Tables<"sources"> {
  return {
    id,
    creator_id: creator.id,
    platform: "youtube",
    source_type: "video",
    external_id: `${id}-external`,
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    published_at: "2026-08-23T10:00:00.000Z",
    imported_at: "2026-08-25T10:00:00.000Z",
    metadata: { youtube_channel_id: "channel-1" },
    created_at: "2026-08-25T10:00:00.000Z",
    updated_at: "2026-08-25T10:00:00.000Z",
  };
}

function buildInput() {
  const sources = [
    importedSource("source-1", "Beginner Editing Workflow"),
    importedSource("source-2", "Editing Tools Walkthrough"),
  ];
  const members = [
    { id: "member-1", display_name: "Alex", creator_id: creator.id, platform: "youtube" },
    { id: "member-2", display_name: "Maya", creator_id: creator.id, platform: "youtube" },
  ] as Tables<"audience_members">[];
  const interactions = [
    {
      id: "interaction-1",
      creator_id: creator.id,
      audience_member_id: "member-1",
      source_id: "source-1",
      platform: "youtube",
      interaction_type: "comment",
      external_id: "comment-1",
      text: "What editing software should beginners use?",
      published_at: "2026-08-24T10:00:00.000Z",
      creator_replied: false,
      parent_interaction_id: null,
      like_count: 0,
      reply_count: 0,
      raw_metadata: { comment_id: "comment-1" },
      created_at: "2026-08-24T10:00:00.000Z",
      updated_at: "2026-08-24T10:00:00.000Z",
    },
    {
      id: "interaction-2",
      creator_id: creator.id,
      audience_member_id: "member-2",
      source_id: "source-2",
      platform: "youtube",
      interaction_type: "comment",
      external_id: "comment-2",
      text: "Should I use these editing tools?",
      published_at: "2026-08-24T11:00:00.000Z",
      creator_replied: false,
      parent_interaction_id: null,
      like_count: 0,
      reply_count: 0,
      raw_metadata: { comment_id: "comment-2" },
      created_at: "2026-08-24T11:00:00.000Z",
      updated_at: "2026-08-24T11:00:00.000Z",
    },
  ] as Tables<"interactions">[];
  const events = sources.map((source, index) => ({
    id: `event-${index + 1}`,
    creator_id: creator.id,
    event_type: "content_published",
    source_id: source.id,
    external_id: `event-${index + 1}-external`,
    title: source.title,
    description: "A new creator video about editing software and workflow.",
    occurred_at: "2026-08-23T10:00:00.000Z",
    payload: { platform: "youtube", topic: "editing software workflow" },
    processed_for_followups_at: null,
    created_at: "2026-08-23T10:00:00.000Z",
    updated_at: "2026-08-23T10:00:00.000Z",
  })) as Tables<"creator_events">[];
  const questions = interactions.map((interaction, index) => ({
    id: `question-${index + 1}`,
    creator_id: creator.id,
    audience_member_id: interaction.audience_member_id,
    interaction_id: interaction.id,
    question_text: interaction.text,
    status: "open",
  })) as Tables<"unresolved_questions">[];
  const actions = [
    {
      id: "action-1",
      creator_id: creator.id,
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
      action_type: "follow_up",
      status: "approved",
      text: "Draft only",
      created_at: "2026-08-25T12:00:00.000Z",
      completed_at: null,
      metadata: { delivery_status: "not_sent" },
    },
    {
      id: "action-2",
      creator_id: creator.id,
      audience_member_id: "member-2",
      interaction_id: "interaction-2",
      creator_event_id: "event-2",
      action_type: "dismiss",
      status: "dismissed",
      text: null,
      created_at: "2026-08-25T13:00:00.000Z",
      completed_at: null,
      metadata: { delivery_status: "not_sent" },
    },
  ] as Tables<"creator_actions">[];

  return {
    creator,
    youtubeConnection: { youtube_channel_id: "channel-1", youtube_channel_title: "Kaelah" },
    sources,
    members,
    interactions,
    questions,
    creatorEvents: events,
    creatorActions: actions,
  };
}

test("judge proof builder handles real imported YouTube data", () => {
  const proof = buildJudgeProofData(buildInput());

  assert.equal(proof.ingestion.dataOrigin, "real-youtube");
  assert.equal(proof.ingestion.channelTitle, "Kaelah");
  assert.equal(proof.ingestion.importedVideoCount, 2);
  assert.equal(proof.ingestion.importedCommentCount, 2);
  assert.equal(proof.ingestion.sourceBackedAudienceCount, 2);
  assert.equal(proof.audience.every((record) => record.imported), true);
});

test("judge proof displays persisted action counts and no sent-reply claim", () => {
  const proof = buildJudgeProofData(buildInput());

  assert.equal(proof.queue.total, 2);
  assert.equal(proof.queue.approved, 1);
  assert.equal(proof.queue.dismissed, 1);
  assert.equal(proof.queue.needsReview, 0);
  assert.equal(proof.queue.actionCount, 2);
  assert.ok(proof.queue.representative);
  assert.equal(proof.queue.representative?.replyStatus, "draft_only");
  assert.doesNotMatch(proof.queue.representative?.suggestedReply ?? "", /posted|sent/i);
});

test("judge proof shows a needs-follow-up-content receipt without posting proof", () => {
  const input = buildInput();
  input.creatorActions.push({
    id: "content-task-1",
    creator_id: creator.id,
    audience_member_id: "member-1",
    interaction_id: "interaction-1",
    creator_event_id: "event-1",
    action_type: "follow_up",
    status: "pending",
    text: null,
    created_at: "2026-08-26T12:00:00.000Z",
    completed_at: null,
    metadata: {
      follow_up_status: "needs_follow_up_content",
      reply_variant: "beginner-friendly",
      reply_tone: "beginner-friendly",
    },
  } as Tables<"creator_actions">);

  const proof = buildJudgeProofData(input);
  const receipt = proof.queue.contentTaskReceipts[0];

  assert.equal(proof.queue.needsFollowUpContent, 1);
  assert.equal(proof.queue.posted, 0);
  assert.equal(receipt?.status, "needs_follow_up_content");
  assert.equal(receipt?.sourceQuestion, "What editing software should beginners use?");
  assert.equal(receipt?.sourceTitle, "Beginner Editing Workflow");
  assert.equal(receipt?.selectedTone, "beginner-friendly");
  assert.equal(receipt?.createdAt, "2026-08-26T12:00:00.000Z");
  assert.equal(receipt?.nextStep, "Create and import the follow-up video");
});

test("judge proof counts posted replies and exposes the saved proof", () => {
  const input = buildInput();
  input.creatorActions = [
    ...input.creatorActions,
    {
      id: "reply-1",
      creator_id: creator.id,
      audience_member_id: "member-1",
      interaction_id: "interaction-1",
      creator_event_id: "event-1",
      action_type: "reply",
      status: "completed",
      text: "Approved reply",
      created_at: "2026-08-25T14:00:00.000Z",
      completed_at: "2026-08-25T14:01:00.000Z",
      metadata: {
        posting_status: "posted",
        opportunity_id: "follow-up:interaction-1:event-1",
        parent_comment_id: "comment-1",
        youtube_reply_id: "reply-1",
        reply_text: "Approved reply",
        posted_at: "2026-08-25T14:01:00.000Z",
        source_id: "source-1",
        source_video_id: "source-1-external",
      },
    },
  ] as Tables<"creator_actions">[];

  const proof = buildJudgeProofData(input);

  assert.equal(proof.queue.posted, 1);
  assert.equal(proof.queue.latestPostedReply?.youtubeReplyId, "reply-1");
  assert.equal(proof.queue.representative?.status, "posted");
  assert.equal(proof.queue.representative?.postedReply?.youtubeReplyId, "reply-1");
});

test("multi-source proof keeps posted YouTube proof separate from Discord opportunities", () => {
  const input = buildInput();
  const discordSource = {
    ...importedSource("discord-source", "#creator-questions"),
    platform: "discord",
    source_type: "discord_channel",
    external_id: "discord-channel-1",
    url: "https://discord.com/channels/guild/channel-1",
    metadata: { discord_guild_id: "guild", discord_channel_id: "channel-1" },
  } as Tables<"sources">;
  const discordEventSource = {
    ...discordSource,
    id: "discord-event-source",
    external_id: "discord-channel-2",
    title: "#announcements",
    url: "https://discord.com/channels/guild/channel-2",
    metadata: { discord_guild_id: "guild", discord_channel_id: "channel-2" },
  } as Tables<"sources">;
  input.sources.push(discordSource, discordEventSource);
  input.members.push({
    id: "discord-member",
    creator_id: creator.id,
    platform: "discord",
    platform_user_id: "discord-user",
    display_name: "Sam",
    avatar_url: null,
    first_seen_at: "2026-08-24T12:00:00.000Z",
    last_seen_at: "2026-08-24T12:00:00.000Z",
    created_at: "2026-08-24T12:00:00.000Z",
    updated_at: "2026-08-24T12:00:00.000Z",
  });
  input.interactions.push({
    id: "discord-interaction",
    creator_id: creator.id,
    audience_member_id: "discord-member",
    source_id: discordSource.id,
    platform: "discord",
    interaction_type: "comment",
    external_id: "discord-message-1",
    text: "What beginner editing software should I try?",
    published_at: "2026-08-24T12:00:00.000Z",
    creator_replied: false,
    parent_interaction_id: null,
    like_count: null,
    reply_count: null,
    raw_metadata: { discord_message_id: "discord-message-1" },
    created_at: "2026-08-24T12:00:00.000Z",
    updated_at: "2026-08-24T12:00:00.000Z",
  });
  input.questions.push({
    id: "discord-question",
    creator_id: creator.id,
    audience_member_id: "discord-member",
    interaction_id: "discord-interaction",
    question_text: "What beginner editing software should I try?",
    status: "open",
    resolution_type: null,
    resolved_by_interaction_id: null,
    resolved_at: null,
    dismissed_at: null,
    created_at: "2026-08-24T12:00:00.000Z",
    updated_at: "2026-08-24T12:00:00.000Z",
  });
  input.creatorEvents.push({
    id: "discord-event",
    creator_id: creator.id,
    event_type: "product_update",
    source_id: discordEventSource.id,
    external_id: "discord-message-2",
    title: "Beginner editing software walkthrough is live",
    description: "A beginner editing software walkthrough is now available.",
    occurred_at: "2026-08-26T12:00:00.000Z",
    payload: { discord_message_id: "discord-message-2" },
    processed_for_followups_at: null,
    created_at: "2026-08-26T12:00:00.000Z",
    updated_at: "2026-08-26T12:00:00.000Z",
  });
  input.creatorActions.push({
    id: "reply-1",
    creator_id: creator.id,
    audience_member_id: "member-1",
    interaction_id: "interaction-1",
    creator_event_id: "event-1",
    action_type: "reply",
    status: "completed",
    text: "Approved reply",
    created_at: "2026-08-25T14:00:00.000Z",
    completed_at: "2026-08-25T14:01:00.000Z",
    metadata: {
      posting_status: "posted",
      opportunity_id: "follow-up:interaction-1:event-1",
      parent_comment_id: "comment-1",
      youtube_reply_id: "reply-1",
      reply_text: "Approved reply",
      posted_at: "2026-08-25T14:01:00.000Z",
      source_id: "source-1",
      source_video_id: "source-1-external",
    },
  } as Tables<"creator_actions">);

  const proof = buildJudgeProofData(input);

  assert.equal(proof.queue.total, 3);
  assert.equal(proof.queue.posted, 1);
  assert.equal(proof.queue.dismissed, 1);
  assert.equal(proof.queue.needsReview, 1);
  assert.equal(proof.queue.discordOpportunities, 1);
  assert.equal(proof.queue.latestPostedReply?.youtubeReplyId, "reply-1");
  assert.equal(proof.queue.latestPostedSourceComment, "What editing software should beginners use?");
  assert.equal(proof.queue.representative?.sourcePlatform, "youtube");
  assert.equal(proof.discord.opportunityCount, 1);
  assert.equal(proof.discord.representative?.sourcePlatform, "discord");
  assert.equal(proof.discord.representative?.replyStatus, "draft_only");
});

test("judge proof identifies Minds evidence as script proof", () => {
  const proof = buildJudgeProofData(buildInput());

  assert.equal(proof.minds.verdict, "verified");
  assert.equal(proof.minds.label, "SCRIPT-VERIFIED / NOT LIVE PER CARD");
  assert.equal(proof.minds.runId, "memora-spike-1787668157736");
  assert.equal(proof.minds.conversationId, "1abb503e-f36b-1410-8466-00039ce7df11");
});

test("judge proof includes community onboarding receipt state", () => {
  const proof = buildJudgeProofData({
    ...buildInput(),
    discordConnection: { guild_id: "1541889129237848164", selected_channel_ids: ["1541890626864554110"] },
    onboardingSettings: { enabled: true, send_mode: "draft_only" },
    onboardingReceipts: [{
      id: "receipt-1",
      creator_id: creator.id,
      discord_connection_id: "connection-1",
      guild_id: "1541889129237848164",
      channel_id: "1541890626864554110",
      discord_user_id: "discord-user-1",
      discord_username: "Kaelah",
      trigger_type: "guide_request",
      source_message_id: "discord-message-1",
      mind_conversation_id: "mind-conversation-1",
      generated_message: "Start in #announcements.",
      sent_message_id: null,
      status: "drafted",
      reason: "Generated for creator review.",
      created_at: "2026-08-26T12:00:00.000Z",
    }],
  });

  assert.equal(proof.onboarding.enabled, true);
  assert.equal(proof.onboarding.sendMode, "draft_only");
  assert.equal(proof.onboarding.receiptsCount, 1);
  assert.equal(proof.onboarding.latestMember, "Kaelah");
  assert.equal(proof.onboarding.latestStatus, "drafted");
  assert.equal(proof.onboarding.latestMindConversationId, "mind-conversation-1");
  assert.deepEqual(proof.discord.monitoredChannelIds, ["1541890626864554110"]);
});

test("judge proof exposes the live onboarding source and listener label", () => {
  const input = buildInput();
  const source = {
    id: "discord-source-1",
    creator_id: creator.id,
    platform: "discord",
    source_type: "discord_channel",
    external_id: "1541890626864554110",
    title: "#creator-questions",
    url: "https://discord.com/channels/1541889129237848164/1541890626864554110",
    published_at: null,
    imported_at: "2026-08-26T12:00:00.000Z",
    metadata: { discord_guild_id: "1541889129237848164", discord_channel_id: "1541890626864554110" },
    created_at: "2026-08-26T12:00:00.000Z",
    updated_at: "2026-08-26T12:00:00.000Z",
  } as Tables<"sources">;
  const member = {
    id: "discord-member-1",
    creator_id: creator.id,
    platform: "discord",
    platform_user_id: "discord-user-1",
    display_name: "Kaelah",
    avatar_url: null,
    first_seen_at: "2026-08-26T12:00:00.000Z",
    last_seen_at: "2026-08-26T12:00:00.000Z",
  } as Tables<"audience_members">;
  const interaction = {
    id: "discord-interaction-1",
    creator_id: creator.id,
    audience_member_id: member.id,
    source_id: source.id,
    platform: "discord",
    interaction_type: "comment",
    external_id: "discord-message-1",
    text: "I'm new here, where do I start?",
    published_at: "2026-08-26T12:00:00.000Z",
    creator_replied: false,
    parent_interaction_id: null,
    like_count: null,
    reply_count: null,
    raw_metadata: { discord_message_id: "discord-message-1", read_only: true },
    created_at: "2026-08-26T12:00:00.000Z",
    updated_at: "2026-08-26T12:00:00.000Z",
  } as Tables<"interactions">;
  const proof = buildJudgeProofData({
    ...input,
    sources: [...input.sources, source],
    members: [...input.members, member],
    interactions: [...input.interactions, interaction],
    discordConnection: { guild_id: "1541889129237848164", selected_channel_ids: [source.external_id as string] },
    onboardingSettings: { enabled: true, send_mode: "auto_send_clear_guide_requests" },
    onboardingReceipts: [{
      id: "receipt-live-1",
      creator_id: creator.id,
      discord_connection_id: "connection-1",
      guild_id: "1541889129237848164",
      channel_id: source.external_id as string,
      discord_user_id: "discord-user-1",
      discord_username: "Kaelah",
      trigger_type: "guide_request",
      source_message_id: "discord-message-1",
      mind_conversation_id: "mind-conversation-live-1",
      generated_message: "Start in #announcements.",
      sent_message_id: "sent-message-live-1",
      status: "sent",
      reason: "Live Discord listener: Sent by configured auto_send_clear_guide_requests onboarding rule.",
      created_at: "2026-08-26T12:00:00.000Z",
    }],
  });

  assert.equal(proof.onboarding.liveListener, true);
  assert.equal(proof.onboarding.latestSourceMessageId, "discord-message-1");
  assert.equal(proof.onboarding.latestSourceMessage, "I'm new here, where do I start?");
  assert.equal(proof.onboarding.latestSentMessageId, "sent-message-live-1");
});

test("judge proof has an honest empty state without YouTube imports", () => {
  const proof = buildJudgeProofData({
    creator,
    youtubeConnection: null,
    sources: [],
    members: [],
    interactions: [],
    questions: [],
    creatorEvents: [],
    creatorActions: [],
  });

  assert.equal(proof.ingestion.dataOrigin, "none");
  assert.equal(proof.ingestion.importedCommentCount, 0);
  assert.equal(proof.queue.total, 0);
  assert.equal(proof.queue.representative, null);
  assert.equal(proof.systemStatus.supabasePersistenceVerified, true);
});
