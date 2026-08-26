"use server";

import { revalidatePath } from "next/cache";

import { getCreatorWorkspace } from "@/lib/data/creators";
import { recordCreatorAction } from "@/lib/data/creator-actions";

export type FollowUpReviewAction = "approve" | "dismiss";

interface FollowUpReviewInput {
  action: FollowUpReviewAction;
  opportunityId: string;
  interactionId: string;
  creatorEventId: string;
  audienceMemberId: string;
  draft: string;
}

export async function reviewFollowUpOpportunity(input: FollowUpReviewInput): Promise<{
  ok: boolean;
  status?: "approved" | "dismissed";
  error?: string;
}> {
  if (!input.opportunityId || !input.interactionId || !input.creatorEventId || !input.audienceMemberId) {
    return { ok: false, error: "This opportunity is missing the source records needed for review." };
  }

  const creatorResult = await getCreatorWorkspace();
  if (!creatorResult.access.available || !creatorResult.data) {
    return { ok: false, error: creatorResult.error ?? "The creator workspace is not available." };
  }

  const approved = input.action === "approve";
  const result = await recordCreatorAction({
    creator_id: creatorResult.data.id,
    audience_member_id: input.audienceMemberId,
    interaction_id: input.interactionId,
    creator_event_id: input.creatorEventId,
    action_type: approved ? "follow_up" : "dismiss",
    status: approved ? "approved" : "dismissed",
    text: approved ? input.draft : null,
    metadata: {
      delivery_status: "not_sent",
      opportunity_id: input.opportunityId,
      source: "p2-follow-up-queue",
    },
  });

  if (result.error || !result.data) return { ok: false, error: result.error ?? "The review action could not be saved." };

  revalidatePath("/app/follow-up");
  return { ok: true, status: approved ? "approved" : "dismissed" };
}
