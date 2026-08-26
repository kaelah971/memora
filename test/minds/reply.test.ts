import assert from "node:assert/strict";
import test from "node:test";

import type { MessageRecord, MindsClient } from "@animocabrands/minds-client-lib";

import { sendAndPollForMindReply } from "../../lib/minds/reply";

function message(
  fingerprint: string,
  senderType: number,
  messageText: string,
): MessageRecord {
  return {
    fingerprint,
    senderType,
    messageText,
    createdAt: "2026-08-25T12:00:00.000Z",
  };
}

test("history polling finds a reply after the sent message", async () => {
  const human = message("human-1", 1, "Reply with exactly: PONG");
  const mind = message("mind-1", 0, "PONG");
  let historyCalls = 0;
  const client = {
    getHistory: async () => {
      historyCalls += 1;
      return historyCalls === 1 ? [] : historyCalls === 2 ? [human] : [mind, human];
    },
    getLatestHistoryFingerprint: async () => historyCalls >= 3 ? "human-1" : undefined,
    sendMessage: async () => ({ messageId: "human-1" }),
  } as unknown as MindsClient;

  const result = await sendAndPollForMindReply(client, "memora-ping", "Reply with exactly: PONG", {
    timeoutMs: 20,
    pollIntervalMs: 1,
  });

  assert.equal(result.response, "PONG");
  assert.equal(result.timedOut, false);
  assert.equal(result.latestFingerprint, "mind-1");
  assert.equal(result.sdkLatestFingerprint, "human-1");
  assert.equal(result.polls, 2);
});

test("history polling does not reuse a previous reply with the same text", async () => {
  const oldHuman = message("old-human", 1, "Reply with exactly: PONG");
  const oldMind = message("old-mind", 0, "PONG");
  const newHuman = message("new-human", 1, "Reply with exactly: PONG");
  let historyCalls = 0;
  const client = {
    getHistory: async () => {
      historyCalls += 1;
      return historyCalls === 1
        ? [oldHuman, oldMind]
        : [oldHuman, oldMind, newHuman];
    },
    getLatestHistoryFingerprint: async () => "new-human",
    sendMessage: async () => ({ messageId: "new-human" }),
  } as unknown as MindsClient;

  const result = await sendAndPollForMindReply(client, "memora-ping", "Reply with exactly: PONG", {
    timeoutMs: 10,
    pollIntervalMs: 1,
  });

  assert.equal(result.timedOut, true);
  assert.equal(result.response, null);
});
