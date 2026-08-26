import type { BuilderMind, Conversation, MessageRecord } from "@animocabrands/minds-client-lib";

export const MEMORA_MIND_ALIAS_DEFAULT = "memora-main";
export const MINDS_REPLY_TIMEOUT_MS = 180_000;
export const MINDS_REPLY_POLL_INTERVAL_MS = 5_000;

export function getMindsReplyTimeoutMs(
  environment: Record<string, string | undefined> = process.env,
): number {
  const configured = Number(environment.MINDS_REPLY_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= MINDS_REPLY_POLL_INTERVAL_MS
    ? Math.floor(configured)
    : MINDS_REPLY_TIMEOUT_MS;
}

export interface MindsConfig {
  builderApiKey: string;
  mindId: string;
  alias: string;
}

export interface MindsConfigStatus {
  apiKeyConfigured: boolean;
  mindIdConfigured: boolean;
  configuredMindId: string | null;
  alias: string;
  missing: string[];
  ready: boolean;
}

export interface AudienceEvent {
  runId?: string;
  eventId?: string;
  sourceId?: string;
  eventType: "LIVESTREAM_MESSAGE";
  viewerId: string;
  viewerName: string;
  source: string;
  sourceDate: string;
  message: string;
  creatorReplied: boolean;
  relationshipState: "OPEN_QUESTION";
}

export interface CreatorEvent {
  runId?: string;
  eventId?: string;
  sourceId?: string;
  eventType: "NEW_CONTENT";
  title: string;
  publishedDate: string;
  topic: string;
}

export interface EventProof {
  summary: string;
  response: string | null;
  responseReceived: boolean;
  timedOut: boolean;
}

export interface HistoryProof {
  totalMessages: number;
  humanMessages: number;
  mindReplies: number;
  firstEventRecorded: boolean;
  secondEventRecorded: boolean;
  sameConversation: boolean;
  conversationId: string | null;
  latestFingerprint: string | null;
}

export interface ContinuityProof {
  status: "verified" | "not-verified" | "not-run";
  reason: string;
  viewerReferenced: boolean;
  contextTermsFound: string[];
  followUpReasonFound: boolean;
}

export interface MindsErrorInfo {
  code: string;
  message: string;
  status: number | null;
  requestId: string | null;
}

export interface MindsSpikeResult {
  runId: string;
  status: "verified" | "not-verified" | "failed";
  config: MindsConfigStatus;
  mind: {
    id: string;
    name: string | null;
    enabled: boolean | null;
  } | null;
  connection: {
    status: "connected" | "failed" | "not-run";
    alias: string;
    mindId: string | null;
    conversationId: string | null;
  };
  firstEvent: EventProof | null;
  secondEvent: EventProof | null;
  history: HistoryProof | null;
  continuity: ContinuityProof;
  error: MindsErrorInfo | null;
}

export interface ConversationContext {
  conversation: Conversation;
  mind: BuilderMind;
  history: MessageRecord[];
}
