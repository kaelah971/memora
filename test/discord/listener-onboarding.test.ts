import assert from "node:assert/strict";
import test from "node:test";

import type { DataClient } from "../../lib/data/types";
import type { LiveGuideRequestInput } from "../../lib/discord/live-listener";
import {
  runDiscordListenerOnboardingAttempt,
  type DiscordListenerOnboardingContext,
  type DiscordListenerOnboardingDependencies,
} from "../../lib/discord/listener-onboarding";
import type { DiscordOnboardingSettingsInput } from "../../lib/discord/onboarding-settings";
import type { DiscordOnboardingReceipt, DiscordListenerStorage } from "../../lib/discord/listener-storage";
import type { TablesInsert } from "../../lib/supabase/database.types";

const fallbackGuide = "Start in #announcements, then ask questions in #creator-questions. Use #support if you get stuck.";
const storage = { client: {} as DataClient, status: { available: true, mode: "service_role", reason: null } } as DiscordListenerStorage;
const settings: DiscordOnboardingSettingsInput = {
  enabled: true,
  sendMode: "auto_send_clear_guide_requests",
  welcomeChannelId: "announcements",
  resourceChannelId: "announcements",
  questionChannelId: "creator-questions",
  supportChannelId: "support",
  builderChannelId: "builders",
  beginnerGuideText: fallbackGuide,
};
const context: DiscordListenerOnboardingContext = {
  creatorId: "creator-1",
  connectionId: "connection-1",
  guildId: "guild-1",
  communityName: "Memora Community",
  creatorVoice: "beginner-friendly",
  settings,
  settingsRowId: "settings-1",
  monitoredChannelIds: ["creator-questions"],
  channels: [
    { id: "announcements", name: "announcements", label: "resource channel" },
    { id: "creator-questions", name: "creator-questions", label: "question channel" },
    { id: "support", name: "support", label: "support channel" },
    { id: "builders", name: "builders", label: "builder channel" },
  ],
};

function input(sourceMessageId: string, sourceChannelId = "creator-questions"): LiveGuideRequestInput & { triggerType: "guide_request"; triggerReason: string } {
  return {
    userId: "member-1",
    username: "Kaelah",
    sourceChannelId,
    sourceMessageId,
    sourceMessageText: "can someone show me the beginner guide?",
    triggerType: "guide_request",
    triggerReason: "show_beginner_guide",
  };
}

function receipt(overrides: Partial<DiscordOnboardingReceipt> = {}): DiscordOnboardingReceipt {
  return {
    id: "receipt-1",
    creator_id: context.creatorId,
    discord_connection_id: context.connectionId,
    guild_id: context.guildId,
    channel_id: "announcements",
    discord_user_id: "member-1",
    discord_username: "Kaelah",
    trigger_type: "guide_request",
    source_message_id: "message-1",
    mind_conversation_id: "mind-1",
    generated_message: "Generated guide",
    sent_message_id: null,
    status: "drafted",
    reason: "Live Discord listener: drafted",
    created_at: "2026-08-26T12:00:00.000Z",
    ...overrides,
  };
}

function memoryDependencies(overrides: Partial<DiscordListenerOnboardingDependencies> = {}): Partial<DiscordListenerOnboardingDependencies> {
  return {
    findRecentReceipt: async () => null,
    getMemberMemory: async () => ({ member: null, interactions: [], receipts: [] }),
    recordMemory: async () => ({ interactionId: "interaction-1" }),
    updateMemoryStatus: async () => undefined,
    createReceipt: async (_storage, row: TablesInsert<"discord_onboarding_receipts">) => receipt({
      ...row,
      source_message_id: row.source_message_id ?? null,
      mind_conversation_id: row.mind_conversation_id ?? null,
      generated_message: row.generated_message ?? "",
      sent_message_id: row.sent_message_id ?? null,
      status: row.status ?? "drafted",
      reason: row.reason ?? "",
    }),
    updateReceipt: async (_storage, _receiptId, update) => receipt(update),
    ...overrides,
  };
}

test("Minds fetch failure falls back to the saved deterministic beginner guide", async () => {
  let sentText = "";
  const calls: { createdRow: TablesInsert<"discord_onboarding_receipts"> | null } = { createdRow: null };
  const result = await runDiscordListenerOnboardingAttempt(storage, "discord-token", context, input("message-fallback"), memoryDependencies({
    generateMessage: async () => {
      throw new TypeError("fetch failed");
    },
    createReceipt: async (_storage, row) => {
      calls.createdRow = row;
      return receipt({ ...row, source_message_id: row.source_message_id ?? null, generated_message: row.generated_message ?? "" });
    },
    updateReceipt: async (_storage, _receiptId, update) => receipt({ ...update, source_message_id: "message-fallback", generated_message: fallbackGuide, status: update.status ?? "drafted", sent_message_id: update.sent_message_id ?? null }),
    sendMessage: async (_botToken, _guildId, _channelId, content) => {
      sentText = content;
      return { id: "sent-fallback" };
    },
  }));

  assert.equal(sentText, fallbackGuide);
  assert.equal(calls.createdRow?.generated_message, fallbackGuide);
  assert.equal(calls.createdRow?.mind_conversation_id, null);
  assert.equal(result.receipt?.status, "sent");
});

test("Discord send fetch failure records an honest failed receipt", async () => {
  const calls: { updated: Partial<Pick<DiscordOnboardingReceipt, "sent_message_id" | "status" | "reason">> | null } = { updated: null };
  const result = await runDiscordListenerOnboardingAttempt(storage, "discord-token", context, input("message-send-failure"), memoryDependencies({
    generateMessage: async () => ({ message: "Generated guide", mindId: "mind-1", conversationId: "conversation-1", prompt: "prompt" }),
    createReceipt: async (_storage, row) => receipt({ ...row, source_message_id: row.source_message_id ?? null, generated_message: row.generated_message ?? "", status: "drafted", sent_message_id: null }),
    sendMessage: async () => {
      throw new TypeError("fetch failed");
    },
    updateReceipt: async (_storage, _receiptId, update) => {
      calls.updated = update;
      return receipt({ ...update, source_message_id: "message-send-failure", generated_message: "Generated guide", status: update.status ?? "drafted", sent_message_id: update.sent_message_id ?? null });
    },
  }));

  assert.equal(result.receipt?.status, "failed");
  assert.equal(result.receipt?.sent_message_id, null);
  assert.equal(result.receipt?.generated_message, "Generated guide");
  assert.match(result.receipt?.reason ?? "", /discord_send_failed/);
  assert.match(result.receipt?.reason ?? "", /network_fetch_failed/);
  assert.match(result.receipt?.reason ?? "", /trigger_reason=show_beginner_guide/);
  assert.match(result.receipt?.reason ?? "", /intended_channel_id=creator-questions/);
  assert.equal(calls.updated?.status, "failed");
  assert.equal(calls.updated?.sent_message_id, undefined);
});

test("a failed receipt blocks the same message ID but allows a fresh message ID", async () => {
  const failed = receipt({ status: "failed", sent_message_id: null, source_message_id: "message-failed" });
  let sends = 0;
  const resultFor = (messageId: string) => runDiscordListenerOnboardingAttempt(storage, "discord-token", context, input(messageId), memoryDependencies({
    findRecentReceipt: async (_storage, request) => request.sourceMessageId === failed.source_message_id ? failed : null,
    generateMessage: async () => ({ message: "Generated guide", mindId: "mind-1", conversationId: "conversation-1", prompt: "prompt" }),
    sendMessage: async () => {
      sends += 1;
      return { id: `sent-${sends}` };
    },
    updateReceipt: async (_storage, _receiptId, update) => receipt({ ...update, status: update.status ?? "drafted", sent_message_id: update.sent_message_id ?? null }),
  }));

  const duplicate = await resultFor("message-failed");
  const fresh = await resultFor("message-fresh");

  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.receipt?.status, "failed");
  assert.equal(fresh.duplicate, false);
  assert.equal(fresh.receipt?.status, "sent");
  assert.equal(sends, 1);
});

test("member joins use the configured welcome channel", async () => {
  let sentChannelId = "";
  const result = await runDiscordListenerOnboardingAttempt(storage, "discord-token", context, {
    ...input("member-join"),
    triggerType: "member_join",
    triggerReason: "member_join",
    sourceMessageText: "",
  }, memoryDependencies({
    generateMessage: async () => ({ message: "Welcome to Memora.", mindId: "mind-1", conversationId: "conversation-1", prompt: "prompt" }),
    sendMessage: async (_botToken, _guildId, channelId) => {
      sentChannelId = channelId;
      return { id: "sent-welcome" };
    },
    updateReceipt: async (_storage, _receiptId, update) => receipt({ ...update, channel_id: "announcements", status: update.status ?? "drafted", sent_message_id: update.sent_message_id ?? null }),
  }));

  assert.equal(sentChannelId, "announcements");
  assert.equal(result.receipt?.status, "sent");
  assert.equal(result.receipt?.channel_id, "announcements");
  assert.match(result.receipt?.reason ?? "", /destination_reason=welcome_channel/);
});

test("guide requests reply in the source channel for every readable selected channel", async () => {
  for (const [index, sourceChannelId] of ["creator-questions", "announcements", "support", "builders"].entries()) {
    let sentChannelId = "";
    const sourceContext = { ...context, monitoredChannelIds: [sourceChannelId] };
    const result = await runDiscordListenerOnboardingAttempt(storage, "discord-token", sourceContext, input(`source-${index}`, sourceChannelId), memoryDependencies({
      generateMessage: async () => ({ message: "Here is the configured guide.", mindId: "mind-1", conversationId: "conversation-1", prompt: "prompt" }),
      sendMessage: async (_botToken, _guildId, channelId) => {
        sentChannelId = channelId;
        return { id: `sent-${index}` };
      },
      createReceipt: async (_storage, row) => receipt({ ...row, source_message_id: row.source_message_id ?? null, generated_message: row.generated_message ?? "", status: "drafted", sent_message_id: null }),
      updateReceipt: async (_storage, _receiptId, update) => receipt({ ...update, channel_id: sourceChannelId, status: update.status ?? "drafted", sent_message_id: update.sent_message_id ?? null }),
    }));

    assert.equal(sentChannelId, sourceChannelId);
    assert.equal(result.receipt?.channel_id, sourceChannelId);
    assert.match(result.receipt?.reason ?? "", /sent_channel_id=/);
  }
});
