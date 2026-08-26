import type { MessageRecord, MindsClient } from "@animocabrands/minds-client-lib";

import {
  getMindsReplyTimeoutMs,
  MINDS_REPLY_POLL_INTERVAL_MS,
} from "@/lib/minds/types";

export interface HistoryPollSnapshot {
  pollNumber: number;
  history: MessageRecord[];
  latestFingerprint: string | undefined;
  sdkLatestFingerprint: string | undefined;
  changed: boolean;
}

export interface MindReplyCapture {
  response: string | null;
  timedOut: boolean;
  history: MessageRecord[];
  latestFingerprint: string | undefined;
  polls: number;
  timeoutMs: number;
  pollIntervalMs: number;
  baselineSdkFingerprint: string | undefined;
  sdkLatestFingerprint: string | undefined;
  sendResult: Record<string, unknown>;
}

interface ReplyPollOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  onSend?: (result: Record<string, unknown>) => void;
  onPoll?: (snapshot: HistoryPollSnapshot) => void;
}

function isMindMessage(row: MessageRecord): boolean {
  return row.senderType === 0 || row.senderType === 2 || Boolean(row.mindId);
}

function findNewReply(
  history: MessageRecord[],
  baselineFingerprints: ReadonlySet<string>,
  sentMessageText: string,
): string | null {
  const newRows = history.filter((row) => !baselineFingerprints.has(row.fingerprint));
  const reply = newRows.find(
    (row) => row.messageText !== sentMessageText && isMindMessage(row) && row.messageText?.trim(),
  );
  return reply?.messageText?.trim() ?? null;
}

export function latestFingerprintFromHistory(history: MessageRecord[]): string | undefined {
  const datedRows = history.filter((row) => row.createdAt);
  if (datedRows.length === 0) return history[0]?.fingerprint;

  return datedRows.reduce((latest, row) =>
    row.createdAt && latest.createdAt && row.createdAt > latest.createdAt ? row : latest,
  ).fingerprint;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function sendAndPollForMindReply(
  client: MindsClient,
  alias: string,
  messageText: string,
  options: ReplyPollOptions = {},
): Promise<MindReplyCapture> {
  const timeoutMs = options.timeoutMs ?? getMindsReplyTimeoutMs();
  const pollIntervalMs = options.pollIntervalMs ?? MINDS_REPLY_POLL_INTERVAL_MS;
  const baselineHistory = await client.getHistory(alias);
  const baselineFingerprints = new Set(baselineHistory.map((row) => row.fingerprint));
  const sendResult = await client.sendMessage({ alias, messageText });
  options.onSend?.(sendResult);

  const deadline = Date.now() + timeoutMs;
  let history: MessageRecord[] = baselineHistory;
  const baselineSdkFingerprint = await client.getLatestHistoryFingerprint(alias);
  let latestFingerprint = latestFingerprintFromHistory(baselineHistory);
  let sdkLatestFingerprint = baselineSdkFingerprint;
  let polls = 0;

  while (true) {
    history = await client.getHistory(alias);
    sdkLatestFingerprint = await client.getLatestHistoryFingerprint(alias);
    latestFingerprint = latestFingerprintFromHistory(history);
    polls += 1;
    const changed = history.some((row) => !baselineFingerprints.has(row.fingerprint));
    options.onPoll?.({ pollNumber: polls, history, latestFingerprint, sdkLatestFingerprint, changed });

    const response = findNewReply(history, baselineFingerprints, messageText);
    if (response) {
      return {
        response,
        timedOut: false,
        history,
        latestFingerprint,
        polls,
        timeoutMs,
        pollIntervalMs,
        baselineSdkFingerprint,
        sdkLatestFingerprint,
        sendResult,
      };
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return {
        response: null,
        timedOut: true,
        history,
        latestFingerprint,
        polls,
        timeoutMs,
        pollIntervalMs,
        baselineSdkFingerprint,
        sdkLatestFingerprint,
        sendResult,
      };
    }

    await wait(Math.min(pollIntervalMs, remaining));
  }
}
