import type {
  BuilderMind,
  MessageRecord,
  MindsClient,
} from "@animocabrands/minds-client-lib";

import { createAuthenticatedMindsClient } from "@/lib/minds/client";
import { getMindsConfigStatus, readMindsConfig } from "@/lib/minds/config";
import {
  createSpikeEvents,
  serializeAudienceEvent,
  serializeCreatorEvent,
} from "@/lib/minds/events";
import { MindsIntegrationError, toMindsErrorInfo } from "@/lib/minds/errors";
import {
  latestFingerprintFromHistory,
  sendAndPollForMindReply,
  type MindReplyCapture,
} from "@/lib/minds/reply";
import {
  type ContinuityProof,
  type EventProof,
  type HistoryProof,
  type MindsSpikeResult,
} from "@/lib/minds/types";

interface ReplyCapture {
  response: string | null;
  timedOut: boolean;
  history: MessageRecord[];
  latestFingerprint: string | undefined;
  timeoutMs: number;
}

function isMindMessage(row: MessageRecord): boolean {
  return row.senderType === 0 || row.senderType === 2 || Boolean(row.mindId);
}

async function getReplyAfterSend(
  client: MindsClient,
  alias: string,
  messageText: string,
): Promise<ReplyCapture> {
  const outcome: MindReplyCapture = await sendAndPollForMindReply(
    client,
    alias,
    messageText,
  );

  return {
    response: outcome.response,
    timedOut: outcome.timedOut,
    history: outcome.history,
    latestFingerprint: outcome.latestFingerprint,
    timeoutMs: outcome.timeoutMs,
  };
}

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function evaluateContinuity(
  response: string,
  history: HistoryProof,
  audienceEvent: { viewerName: string; message: string },
  creatorEvent: { topic: string },
): ContinuityProof {
  const viewerName = audienceEvent.viewerName.toLowerCase();
  const contextWords = unique([
    ...words(audienceEvent.message),
    ...words(creatorEvent.topic),
  ]).filter((word) => !["what", "should", "does", "this", "that", "from", "your"].includes(word));
  const responseWords = new Set(words(response));
  const contextTermsFound = contextWords.filter((word) => responseWords.has(word));
  const viewerReferenced = response.toLowerCase().includes(viewerName);
  const followUpReasonFound = /follow[- ]?up|reconnect|relevant|answers?|new (video|content)|old (question|conversation)|unresolved|open question/.test(
    response.toLowerCase(),
  );
  const meaningfulReference =
    (viewerReferenced && contextTermsFound.length >= 1) ||
    (contextTermsFound.length >= 2 && /unresolved|open question|earlier|previous|livestream/.test(response.toLowerCase()));
  const historyIsComplete =
    history.firstEventRecorded && history.secondEventRecorded && history.sameConversation;

  if (meaningfulReference && followUpReasonFound && historyIsComplete) {
    return {
      status: "verified",
      reason: "The second reply references the earlier viewer/context and explains a follow-up connection; both events are present in one conversation history.",
      viewerReferenced,
      contextTermsFound,
      followUpReasonFound,
    };
  }

  return {
    status: "not-verified",
    reason: "The API returned a reply, but the response did not conservatively satisfy the viewer/context, follow-up reasoning, and shared-history checks.",
    viewerReferenced,
    contextTermsFound,
    followUpReasonFound,
  };
}

function buildHistoryProof(
  history: MessageRecord[],
  firstMessage: string,
  secondMessage: string,
  conversationId: string,
  latestFingerprint: string | undefined,
): HistoryProof {
  const firstEventRecorded = history.some((row) => row.messageText?.includes("MEMORA AUDIENCE EVENT"));
  const secondEventRecorded = history.some((row) => row.messageText?.includes("MEMORA CREATOR EVENT"));
  const historyConversationIds = history
    .map((row) => row.conversationId)
    .filter((id): id is string => Boolean(id));
  const sameConversation =
    historyConversationIds.length === 0 || historyConversationIds.every((id) => id === conversationId);

  return {
    totalMessages: history.length,
    humanMessages: history.filter((row) => row.senderType === 1).length,
    mindReplies: history.filter((row) => isMindMessage(row)).length,
    firstEventRecorded: firstEventRecorded && history.some((row) => row.messageText === firstMessage),
    secondEventRecorded: secondEventRecorded && history.some((row) => row.messageText === secondMessage),
    sameConversation,
    conversationId,
    latestFingerprint: latestFingerprint ?? null,
  };
}

function emptyContinuity(): ContinuityProof {
  return {
    status: "not-run",
    reason: "The continuity check has not run.",
    viewerReferenced: false,
    contextTermsFound: [],
    followUpReasonFound: false,
  };
}

function createRunId(): string {
  return `memora-spike-${Date.now()}`;
}

function emptyResult(runId: string): MindsSpikeResult {
  const config = getMindsConfigStatus();
  return {
    runId,
    status: "failed",
    config,
    mind: null,
    connection: {
      status: "not-run",
      alias: config.alias,
      mindId: config.configuredMindId,
      conversationId: null,
    },
    firstEvent: null,
    secondEvent: null,
    history: null,
    continuity: emptyContinuity(),
    error: null,
  };
}

function eventProof(summary: string, capture: ReplyCapture): EventProof {
  return {
    summary,
    response: capture.response,
    responseReceived: Boolean(capture.response),
    timedOut: capture.timedOut,
  };
}

export async function runMemoraContinuitySpike(runId = createRunId()): Promise<MindsSpikeResult> {
  const result = emptyResult(runId);
  const { audience: audienceEvent, creator: creatorEvent } = createSpikeEvents(runId);
  let config;

  try {
    config = readMindsConfig();
    result.config = getMindsConfigStatus();

    const firstSessionClient = createAuthenticatedMindsClient(config);
    const mind: BuilderMind = await firstSessionClient.getMind(config.mindId);
    result.mind = {
      id: mind.mindId,
      name: mind.name ?? null,
      enabled: typeof mind.isEnabled === "boolean" ? mind.isEnabled : null,
    };

    if (mind.isEnabled === false) {
      throw new MindsIntegrationError("API", `Configured Mind ${config.mindId} is disabled.`, { status: 409 });
    }

    const conversation = await firstSessionClient.ensureConversation(config.alias, config.mindId);
    const resolvedMindId = await firstSessionClient.getMindIdForAlias(config.alias);
    if (resolvedMindId && resolvedMindId !== config.mindId) {
      throw new MindsIntegrationError(
        "API",
        `Conversation alias ${config.alias} resolves to a different Mind than MEMORA_MIND_ID.`,
        { status: 409 },
      );
    }

    result.connection = {
      status: "connected",
      alias: config.alias,
      mindId: resolvedMindId ?? config.mindId,
      conversationId: conversation.conversationId,
    };

    const firstMessage = serializeAudienceEvent(audienceEvent);
    const firstReply = await getReplyAfterSend(
      firstSessionClient,
      config.alias,
      firstMessage,
    );
    result.firstEvent = eventProof(
      `${audienceEvent.viewerName} asked: ${audienceEvent.message}`,
      firstReply,
    );
    if (!firstReply.response) {
      result.history = buildHistoryProof(
        firstReply.history,
        firstMessage,
        "",
        conversation.conversationId,
        firstReply.latestFingerprint,
      );
      throw new MindsIntegrationError(
        "TIMEOUT",
        `No Mind reply arrived within ${firstReply.timeoutMs / 1000} seconds; history was polled every 5 seconds.`,
      );
    }

    // New client instance intentionally represents a later application session.
    const secondSessionClient = createAuthenticatedMindsClient(config);
    const sameConversation = await secondSessionClient.getConversation(config.alias);
    if (sameConversation.conversationId !== conversation.conversationId) {
      throw new MindsIntegrationError(
        "API",
        `Conversation alias ${config.alias} did not resolve to the same conversation in the second session.`,
        { status: 409 },
      );
    }

    const secondMessage = serializeCreatorEvent(creatorEvent);
    const secondReply = await getReplyAfterSend(
      secondSessionClient,
      config.alias,
      secondMessage,
    );
    result.secondEvent = eventProof(
      `New content: ${creatorEvent.title} (${creatorEvent.topic})`,
      secondReply,
    );
    if (!secondReply.response) {
      result.history = buildHistoryProof(
        secondReply.history,
        firstMessage,
        secondMessage,
        conversation.conversationId,
        secondReply.latestFingerprint,
      );
      throw new MindsIntegrationError(
        "TIMEOUT",
        `No Mind reply arrived within ${secondReply.timeoutMs / 1000} seconds; history was polled every 5 seconds.`,
      );
    }

    const history = await secondSessionClient.getHistory(config.alias);
    const latestFingerprint = latestFingerprintFromHistory(history);
    result.history = buildHistoryProof(
      history,
      firstMessage,
      secondMessage,
      conversation.conversationId,
      latestFingerprint,
    );
    result.continuity = evaluateContinuity(
      secondReply.response ?? "",
      result.history,
      audienceEvent,
      creatorEvent,
    );
    result.status = result.continuity.status === "verified" ? "verified" : "not-verified";

    return result;
  } catch (error) {
    result.status = "failed";
    result.error = toMindsErrorInfo(error, config?.builderApiKey);
    if (result.connection.status === "not-run") {
      result.connection.status = "failed";
    }
    return result;
  }
}

export function createMindsSpikeFailure(error: {
  code: string;
  message: string;
  status?: number | null;
  requestId?: string | null;
}): MindsSpikeResult {
  const result = emptyResult(createRunId());
  result.error = {
    code: error.code,
    message: error.message,
    status: error.status ?? null,
    requestId: error.requestId ?? null,
  };
  return result;
}
