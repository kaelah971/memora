"use server";

import { revalidatePath } from "next/cache";

import { getCreatorWorkspace } from "@/lib/data/creators";
import { recordCreatorAction } from "@/lib/data/creator-actions";
import { getFollowUpReplyVariants, isFollowUpReplyVariant, type FollowUpReplyVariant } from "@/lib/data/follow-up-builder";
import { listFollowUpOpportunities } from "@/lib/data/follow-up-opportunities";

export type FollowUpReviewAction = "approve" | "dismiss";

export interface FollowUpReviewInput {
  action: FollowUpReviewAction;
  opportunityId: string;
  interactionId: string;
  creatorEventId: string;
  audienceMemberId: string;
  draft: string;
  replyVariant: FollowUpReplyVariant;
}

interface FollowUpOpportunityInput {
  opportunityId: string;
  interactionId: string;
  creatorEventId: string;
  audienceMemberId: string;
  replyVariant?: FollowUpReplyVariant;
}

async function getReviewContext(input: FollowUpOpportunityInput) {
  const creatorResult = await getCreatorWorkspace();
  if (!creatorResult.access.available || !creatorResult.data) {
    return { error: creatorResult.error ?? "The creator workspace is not available." };
  }
  const queueResult = await listFollowUpOpportunities(creatorResult.data.id);
  if (!queueResult.access.available || queueResult.error) {
    return { error: queueResult.error ?? "The follow-up opportunity could not be verified." };
  }
  const opportunity = queueResult.data.opportunities.find((candidate) =>
    candidate.id === input.opportunityId &&
    candidate.interactionId === input.interactionId &&
    candidate.creatorEventId === input.creatorEventId &&
    candidate.audienceMemberId === input.audienceMemberId,
  );
  return opportunity ? { creator: creatorResult.data, opportunity } : { error: "This follow-up opportunity is no longer available in the active workspace." };
}

export async function reviewFollowUpOpportunity(input: FollowUpReviewInput): Promise<{
  ok: boolean;
  status?: "approved" | "dismissed";
  error?: string;
}> {
  if (!input.opportunityId || !input.interactionId || !input.creatorEventId || !input.audienceMemberId) {
    return { ok: false, error: "This opportunity is missing the source records needed for review." };
  }
  if (input.action !== "approve" && input.action !== "dismiss") {
    return { ok: false, error: "This review action is not supported." };
  }
  if (typeof input.draft !== "string") {
    return { ok: false, error: "The selected reply is invalid." };
  }

  const approved = input.action === "approve";
  const context = await getReviewContext(input);
  if (context.error || !context.creator || !context.opportunity) return { ok: false, error: context.error };
  const canReapproveDifferentVariant = approved &&
    context.opportunity.status === "approved" &&
    context.opportunity.selectedReplyVariant !== input.replyVariant;
  if (context.opportunity.status !== "needs_review" && !canReapproveDifferentVariant) {
    return { ok: false, error: "This opportunity is no longer waiting for creator review." };
  }

  const variants = getFollowUpReplyVariants(context.opportunity);
  if (approved && !isFollowUpReplyVariant(input.replyVariant)) {
    return { ok: false, error: "Choose a reply variant before approving." };
  }
  const selectedDraft = approved ? variants[input.replyVariant] : null;
  if (approved && (!selectedDraft || input.draft.trim() !== selectedDraft)) {
    return { ok: false, error: "The selected reply changed. Refresh the card and review it again." };
  }

  const result = await recordCreatorAction({
    creator_id: context.creator.id,
    audience_member_id: input.audienceMemberId,
    interaction_id: input.interactionId,
    creator_event_id: input.creatorEventId,
    action_type: approved ? "follow_up" : "dismiss",
    status: approved ? "approved" : "dismissed",
    text: selectedDraft,
    metadata: {
      delivery_status: "not_sent",
      opportunity_id: input.opportunityId,
      source: "p2-follow-up-queue",
      reply_variant: approved ? input.replyVariant : null,
      reply_tone: approved ? input.replyVariant : null,
    },
  });

  if (result.error || !result.data) return { ok: false, error: result.error ?? "The review action could not be saved." };

  revalidatePath("/app/follow-up");
  return { ok: true, status: approved ? "approved" : "dismissed" };
}

export async function markFollowUpNeedsContent(input: FollowUpOpportunityInput): Promise<{
  ok: boolean;
  status?: "needs_follow_up_content";
  error?: string;
}> {
  if (!input.opportunityId || !input.interactionId || !input.creatorEventId || !input.audienceMemberId) {
    return { ok: false, error: "This opportunity is missing the source records needed for content planning." };
  }

  const context = await getReviewContext(input);
  if (context.error || !context.creator || !context.opportunity) return { ok: false, error: context.error };
  if (context.opportunity.creatorEventVideoUrl) {
    return { ok: false, error: "A verified follow-up video is already attached to this opportunity." };
  }
  if (context.opportunity.status !== "needs_review" && context.opportunity.status !== "needs_follow_up_content") {
    return { ok: false, error: "This opportunity is no longer available for content planning." };
  }

  const result = await recordCreatorAction({
    creator_id: context.creator.id,
    audience_member_id: input.audienceMemberId,
    interaction_id: input.interactionId,
    creator_event_id: input.creatorEventId,
    action_type: "follow_up",
    status: "pending",
    text: null,
    metadata: {
      delivery_status: "not_sent",
      follow_up_status: "needs_follow_up_content",
      opportunity_id: input.opportunityId,
      source: "p2-follow-up-queue",
      reply_variant: input.replyVariant && isFollowUpReplyVariant(input.replyVariant) ? input.replyVariant : null,
      reply_tone: input.replyVariant && isFollowUpReplyVariant(input.replyVariant) ? input.replyVariant : null,
    },
  });

  if (result.error || !result.data) return { ok: false, error: result.error ?? "The content planning status could not be saved." };

  revalidatePath("/app/follow-up");
  return { ok: true, status: "needs_follow_up_content" };
}
