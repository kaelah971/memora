import assert from "node:assert/strict";
import test from "node:test";

import {
  findRecentDiscordOnboardingReceipt,
  type DiscordListenerStorage,
  type DiscordOnboardingReceipt,
} from "../../lib/discord/listener-storage";
import type { DataClient } from "../../lib/data/types";

const baseInput = {
  creatorId: "creator-1",
  connectionId: "connection-1",
  discordUserId: "member-1",
  triggerType: "guide_request" as const,
};

function receipt(sourceMessageId: string, status: DiscordOnboardingReceipt["status"]): DiscordOnboardingReceipt {
  return {
    id: `receipt-${sourceMessageId}`,
    creator_id: baseInput.creatorId,
    discord_connection_id: baseInput.connectionId,
    guild_id: "1541889129237848164",
    channel_id: "1541890626864554110",
    discord_user_id: baseInput.discordUserId,
    discord_username: "Kaelah",
    trigger_type: "guide_request",
    source_message_id: sourceMessageId,
    mind_conversation_id: null,
    generated_message: "Start in #announcements.",
    sent_message_id: status === "sent" ? "sent-message-1" : null,
    status,
    reason: "Live Discord listener: generated",
    created_at: "2026-08-26T12:00:00.000Z",
  };
}

function storageFor(receipts: DiscordOnboardingReceipt[]): { storage: DiscordListenerStorage; filters: Array<[string, string]> } {
  const filters: Array<[string, string]> = [];
  let sourceMessageId: string | null = null;
  type Query = {
    select: () => Query;
    eq: (column: string, value: string) => Query;
    order: () => Query;
    limit: () => Query;
    maybeSingle: () => Promise<{ data: DiscordOnboardingReceipt | null; error: null }>;
  };
  const query: Query = {
    select: () => query,
    eq: (column, value) => {
      filters.push([column, value]);
      if (column === "source_message_id") sourceMessageId = value;
      return query;
    },
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({ data: receipts.find((candidate) => candidate.source_message_id === sourceMessageId) ?? null, error: null }),
  };
  const client = { from: () => query } as unknown as DataClient;
  return {
    storage: { client, status: { available: true, mode: "service_role", reason: null } },
    filters,
  };
}

test("same Discord message id is the only persistent duplicate key", async () => {
  const { storage, filters } = storageFor([receipt("discord-message-1", "sent")]);
  const result = await findRecentDiscordOnboardingReceipt(storage, {
    ...baseInput,
    sourceMessageId: "discord-message-1",
  });

  assert.equal(result?.id, "receipt-discord-message-1");
  assert.deepEqual(filters, [
    ["creator_id", "creator-1"],
    ["discord_connection_id", "connection-1"],
    ["source_message_id", "discord-message-1"],
  ]);
});

test("a different Discord message id with the same text and member is not a duplicate", async () => {
  const { storage } = storageFor([receipt("discord-message-1", "drafted")]);
  const result = await findRecentDiscordOnboardingReceipt(storage, {
    ...baseInput,
    sourceMessageId: "discord-message-2",
  });

  assert.equal(result, null);
});

test("an old draft receipt does not block a later new message id after auto-send is enabled", async () => {
  const oldDraft = receipt("discord-message-1", "drafted");
  const { storage } = storageFor([oldDraft]);
  const laterMessage = await findRecentDiscordOnboardingReceipt(storage, {
    ...baseInput,
    sourceMessageId: "discord-message-2",
  });
  const replay = await findRecentDiscordOnboardingReceipt(storage, {
    ...baseInput,
    sourceMessageId: "discord-message-1",
  });

  assert.equal(laterMessage, null);
  assert.equal(replay?.status, "drafted");
});
