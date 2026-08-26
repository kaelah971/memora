import "../load-env";

import type { MessageRecord } from "@animocabrands/minds-client-lib";

import { createAuthenticatedMindsClient } from "../../lib/minds/client";
import { readMindsConfig } from "../../lib/minds/config";
import { toMindsErrorInfo } from "../../lib/minds/errors";
import { sendAndPollForMindReply, type HistoryPollSnapshot } from "../../lib/minds/reply";
import { getMindsReplyTimeoutMs } from "../../lib/minds/types";

const PING_ALIAS = "memora-ping";
const PING_MESSAGE = "Reply with exactly: PONG";

function role(row: MessageRecord): string {
  if (row.senderType === 1) return "human";
  if (row.senderType === 0 || row.senderType === 2 || row.mindId) return "mind";
  return "unknown";
}

function safeSendResult(result: Record<string, unknown>): Record<string, unknown> {
  const safeKeys = ["id", "messageId", "fingerprint", "conversationId", "createdAt", "status"];
  return Object.fromEntries(safeKeys.flatMap((key) => key in result ? [[key, result[key]]] : []));
}

function printPoll(snapshot: HistoryPollSnapshot): void {
  console.log(
    `poll ${snapshot.pollNumber}: messages=${snapshot.history.length} changed=${snapshot.changed} latestFingerprint=${snapshot.latestFingerprint ?? "[none]"} sdkLatestFingerprint=${snapshot.sdkLatestFingerprint ?? "[none]"}`,
  );
  for (const row of snapshot.history) {
    console.log(
      `  role=${role(row)} timestamp=${row.createdAt ?? "[none]"} fingerprint=${row.fingerprint}`,
    );
  }
}

async function main(): Promise<void> {
  try {
    const config = readMindsConfig();
    const client = createAuthenticatedMindsClient(config);
    const mind = await client.getMind(config.mindId);
    if (mind.isEnabled === false) throw new Error(`Configured Mind ${config.mindId} is disabled.`);

    const conversation = await client.ensureConversation(PING_ALIAS, config.mindId);
    const resolvedMindId = await client.getMindIdForAlias(PING_ALIAS);
    if (resolvedMindId && resolvedMindId !== config.mindId) {
      throw new Error(`Alias ${PING_ALIAS} resolves to a different Mind.`);
    }

    console.log("Memora Minds ping");
    console.log(`mind: ${mind.name ?? "[unnamed]"}`);
    console.log(`mindId: ${mind.mindId}`);
    console.log(`alias: ${PING_ALIAS}`);
    console.log(`conversationId: ${conversation.conversationId}`);
    console.log(`timeoutSeconds: ${getMindsReplyTimeoutMs() / 1000}`);
    console.log(`message: ${PING_MESSAGE}`);

    const result = await sendAndPollForMindReply(client, PING_ALIAS, PING_MESSAGE, {
      onSend: (sendResult) => console.log(`sendMessage result: ${JSON.stringify(safeSendResult(sendResult))}`),
      onPoll: printPoll,
    });

    console.log(`mindReply: ${result.response ?? "[none]"}`);
    console.log(`finalMessageCount: ${result.history.length}`);
    console.log(`finalFingerprint: ${result.latestFingerprint ?? "[none]"}`);
    console.log(`timedOut: ${result.timedOut}`);
    if (result.timedOut) process.exitCode = 1;
  } catch (error) {
    const diagnostic = toMindsErrorInfo(error);
    console.error(
      `Minds ping failed [${diagnostic.code}]${diagnostic.status ? ` HTTP ${diagnostic.status}` : ""}: ${diagnostic.message}`,
    );
    if (diagnostic.requestId) console.error(`requestId: ${diagnostic.requestId}`);
    process.exitCode = 1;
  }
}

void main();
