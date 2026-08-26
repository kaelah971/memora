import type { Tables } from "@/lib/supabase/database.types";

import { getPostedReplyProof, type FollowUpOpportunity } from "@/lib/data/follow-up-builder";

type CreatorAction = Tables<"creator_actions">;

export type ReplyPostingGateCode = "approval_required" | "reply_already_posted" | "reply_posting_in_progress";

export interface ReplyPostingGateResult {
  allowed: boolean;
  code?: ReplyPostingGateCode;
  approvedText?: string;
}

export function findReplyOpportunity(
  opportunities: FollowUpOpportunity[],
  opportunityId: string | null,
  interactionId: string | null,
): FollowUpOpportunity | null {
  const matches = opportunities.filter((opportunity) =>
    (!opportunityId || opportunity.id === opportunityId) &&
    (!interactionId || opportunity.interactionId === interactionId),
  );
  return matches.find((opportunity) => opportunity.status === "approved") ?? matches[0] ?? null;
}

export function evaluateReplyPostingGate(
  opportunity: FollowUpOpportunity | null,
  actions: CreatorAction[],
): ReplyPostingGateResult {
  if (!opportunity) return { allowed: false, code: "approval_required" };
  const replyActions = actions.filter((action) => action.action_type === "reply");
  if (replyActions.some((action) => getPostedReplyProof(action) || action.status === "completed")) {
    return { allowed: false, code: "reply_already_posted" };
  }
  if (replyActions.some((action) => isPostingAction(action) || action.status === "pending")) {
    return { allowed: false, code: "reply_posting_in_progress" };
  }
  const latestReview = [...actions]
    .filter((action) => action.action_type === "follow_up" || action.action_type === "dismiss")
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
  if (!latestReview || latestReview.action_type !== "follow_up" || latestReview.status !== "approved") {
    return { allowed: false, code: "approval_required" };
  }
  if (typeof latestReview.text !== "string" || !latestReview.text.trim()) {
    return { allowed: false, code: "approval_required" };
  }
  return { allowed: true, approvedText: latestReview.text.trim() };
}

function isPostingAction(action: CreatorAction): boolean {
  return typeof action.metadata === "object" && action.metadata !== null && !Array.isArray(action.metadata) &&
    "posting_status" in action.metadata && action.metadata.posting_status === "posting";
}
