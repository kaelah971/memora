import assert from "node:assert/strict";
import test from "node:test";

import type { DiscordOnboardingReceipt } from "../../lib/data/discord-onboarding";
import {
  classifyLiveDiscordMessage,
  handleLiveDiscordMessage,
  type LiveDiscordMessage,
  type LiveOnboardingRunResult,
} from "../../lib/discord/live-listener";

const channel = { id: "1541890626864554110", name: "creator-questions", type: 0, guild_id: "1541889129237848164" };
const context = { guildId: "1541889129237848164", selectedChannelIds: [channel.id], botUserId: "memora-bot" };

function message(overrides: Partial<LiveDiscordMessage> = {}): LiveDiscordMessage {
  return {
    id: "discord-message-1",
    guildId: context.guildId,
    channel,
    content: "I'm new here, where do I start?",
    timestamp: "2026-08-26T12:00:00.000Z",
    author: { id: "member-1", username: "Kaelah", global_name: "Kaelah", bot: false },
    ...overrides,
  };
}

function receipt(status: DiscordOnboardingReceipt["status"]): DiscordOnboardingReceipt {
  return {
    id: "receipt-1",
    creator_id: "creator-1",
    discord_connection_id: "connection-1",
    guild_id: context.guildId,
    channel_id: channel.id,
    discord_user_id: "member-1",
    discord_username: "Kaelah",
    trigger_type: "guide_request",
    source_message_id: "discord-message-1",
    mind_conversation_id: "mind-conversation-1",
    generated_message: "Start in #announcements.",
    sent_message_id: status === "sent" ? "sent-message-1" : null,
    status,
    reason: "Live Discord listener: generated",
    created_at: "2026-08-26T12:00:00.000Z",
  };
}

function dependencies(
  onboarding: LiveOnboardingRunResult,
  calls: { persisted: number; inputs: Array<{ sourceMessageId: string; sourceChannelId: string }>; persistOptions?: Array<{ allowUnmonitored?: boolean }> },
) {
  return {
    persistMessage: async (_message: LiveDiscordMessage, options?: { allowUnmonitored?: boolean }) => {
      calls.persisted += 1;
      calls.persistOptions?.push(options ?? {});
    },
    runGuideRequest: async (input: { sourceMessageId: string; sourceChannelId: string }) => {
      calls.inputs.push(input);
      return onboarding;
    },
  };
}

test("live listener ignores bot and Memora messages", async () => {
  const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
  assert.equal(classifyLiveDiscordMessage(message({ author: { id: "other-bot", bot: true } }), context), "ignored_bot");
  assert.equal(classifyLiveDiscordMessage(message({ author: { id: "memora-bot", bot: true } }), context), "ignored_self");

  const result = await handleLiveDiscordMessage(message({ author: { id: "other-bot", bot: true } }), context, dependencies({ receipt: null, duplicate: false, ignored: false, error: null }, calls));
  assert.equal(result.outcome, "ignored");
  assert.equal(calls.persisted, 0);
  assert.equal(calls.inputs.length, 0);
});

test("live listener refuses unselected channels and other guilds", async () => {
  const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }>, persistOptions: [] as Array<{ allowUnmonitored?: boolean }> };
  const deps = dependencies({ receipt: null, duplicate: false, ignored: false, error: null }, calls);
  const unselected = message({ channel: { ...channel, id: "1541890000000000000" } });
  const otherGuild = message({ guildId: "1541899999999999999" });

  assert.equal(classifyLiveDiscordMessage(unselected, context), "persist_only");
  assert.equal(classifyLiveDiscordMessage(otherGuild, context), "ignored_guild");
  const unselectedResult = await handleLiveDiscordMessage(unselected, context, deps);
  assert.equal(unselectedResult.outcome, "persisted");
  assert.equal(unselectedResult.classification, "persist_only");
  assert.equal((await handleLiveDiscordMessage(otherGuild, context, deps)).outcome, "ignored");
  assert.equal(calls.persisted, 1);
  assert.deepEqual(calls.persistOptions, [{ allowUnmonitored: true }]);
  assert.equal(calls.inputs.length, 0);
});

test("live listener persists unrelated messages without auto-answering them", async () => {
  const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
  const result = await handleLiveDiscordMessage(
    message({ content: "I still don't understand wallets." }),
    context,
    dependencies({ receipt: null, duplicate: false, ignored: false, error: null }, calls),
  );

  assert.equal(result.classification, "persist_only");
  assert.equal(result.outcome, "persisted");
  assert.equal(calls.persisted, 1);
  assert.equal(calls.inputs.length, 0);
});

test("live listener does not reply when onboarding is disabled", async () => {
  const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
  const result = await handleLiveDiscordMessage(
    message(),
    context,
    dependencies({ receipt: null, duplicate: false, ignored: true, error: null }, calls),
  );

  assert.equal(result.outcome, "ignored");
  assert.equal(calls.persisted, 1);
  assert.equal(calls.inputs.length, 1);
});

test("live listener records draft and sent outcomes with the source message", async () => {
  for (const status of ["drafted", "sent"] as const) {
    const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
    const result = await handleLiveDiscordMessage(
      message(),
      context,
      dependencies({ receipt: receipt(status), duplicate: false, ignored: false, error: null }, calls),
    );

    assert.equal(result.outcome, status);
    assert.equal(result.receipt?.trigger_type, "guide_request");
    assert.equal(result.receipt?.source_message_id, "discord-message-1");
    assert.equal(status === "sent" ? result.receipt?.sent_message_id : null, status === "sent" ? "sent-message-1" : null);
    assert.equal(calls.inputs.length, 1);
    assert.equal(calls.inputs[0]?.sourceMessageId, "discord-message-1");
    assert.equal(calls.inputs[0]?.sourceChannelId, channel.id);
  }
});

test("live listener does not create a second reply for a duplicate message id", async () => {
  const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
  const result = await handleLiveDiscordMessage(
    message(),
    context,
    dependencies({ receipt: receipt("sent"), duplicate: true, ignored: false, error: null }, calls),
  );

  assert.equal(result.outcome, "duplicate");
  assert.equal(result.receipt?.sent_message_id, "sent-message-1");
  assert.equal(calls.persisted, 1);
  assert.equal(calls.inputs.length, 1);
});

test("live listener processes the same guide request text when the Discord message id is new", async () => {
  const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
  const nextReceipt = { ...receipt("sent"), id: "receipt-2", source_message_id: "discord-message-2", sent_message_id: "sent-message-2" };
  const result = await handleLiveDiscordMessage(
    message({ id: "discord-message-2" }),
    context,
    dependencies({ receipt: nextReceipt, duplicate: false, ignored: false, error: null }, calls),
  );

  assert.equal(result.outcome, "sent");
  assert.equal(result.receipt?.source_message_id, "discord-message-2");
  assert.equal(calls.inputs[0]?.sourceMessageId, "discord-message-2");
});

test("live listener dispatches each explicit beginner-guide phrase to onboarding", async () => {
  const guideRequests = [
    "can someone show me the beginner guide?",
    "please where should I start as a beginner creator?",
    "I'm new here, where do I start?",
    "where should I start?",
    "how do I start?",
    "what should I read first?",
  ];

  for (const [index, content] of guideRequests.entries()) {
    const calls = { persisted: 0, inputs: [] as Array<{ sourceMessageId: string; sourceChannelId: string }> };
    const result = await handleLiveDiscordMessage(
      message({ id: `guide-request-${index}`, content }),
      context,
      dependencies({ receipt: receipt("sent"), duplicate: false, ignored: false, error: null }, calls),
    );

    assert.equal(result.classification, "guide_request", content);
    assert.equal(result.outcome, "sent", content);
    assert.equal(calls.persisted, 1, content);
    assert.equal(calls.inputs.length, 1, content);
  }
});
