import { NextResponse } from "next/server";

import { getDevelopmentCreator } from "@/lib/youtube/server";
import { getCurrentYouTubeAccess, getYouTubeConnection } from "@/lib/youtube/storage";
import { insertYouTubeReply, validateYouTubeReplyText } from "@/lib/youtube/replies";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import { recordCreatorAction, updateCreatorAction } from "@/lib/data/creator-actions";
import { listFollowUpOpportunities } from "@/lib/data/follow-up-opportunities";
import { evaluateReplyPostingGate, findReplyOpportunity } from "@/lib/youtube/reply-posting";

interface PostReplyBody {
  opportunityId?: unknown;
  interactionId?: unknown;
  replyText?: unknown;
}

function safeIdentifier(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

export async function POST(request: Request) {
  let reservationId: string | null = null;
  let currentCreatorId: string | null = null;
  let externalPostSucceeded = false;

  try {
    const body = (await request.json()) as PostReplyBody;
    const opportunityId = safeIdentifier(body.opportunityId, 300);
    const interactionId = safeIdentifier(body.interactionId, 100);
    if (!opportunityId && !interactionId) throw new YouTubeIntegrationError("invalid_request", 400);
    const replyText = validateYouTubeReplyText(body.replyText);

    const creator = await getDevelopmentCreator();
    currentCreatorId = creator.id;
    const queueResult = await listFollowUpOpportunities(creator.id);
    if (queueResult.error) throw new YouTubeIntegrationError("storage_error", 500, queueResult.error);
    const opportunity = findReplyOpportunity(queueResult.data.opportunities, opportunityId, interactionId);
    if (!opportunity) throw new YouTubeIntegrationError("invalid_request", 400);

    const access = await getCurrentYouTubeAccess(creator.id);
    const client = access.client;
    const [interactionResult, sourceResult, actionsResult] = await Promise.all([
      client
        .from("interactions")
        .select("id, creator_id, audience_member_id, source_id, platform, external_id, parent_interaction_id")
        .eq("id", opportunity.interactionId)
        .eq("creator_id", creator.id)
        .eq("workspace_id", access.workspaceId)
        .maybeSingle(),
      client
        .from("sources")
        .select("id, external_id, platform, source_type")
        .eq("id", opportunity.sourceId)
        .eq("creator_id", creator.id)
        .eq("workspace_id", access.workspaceId)
        .maybeSingle(),
      client
        .from("creator_actions")
        .select("*")
        .eq("creator_id", creator.id)
        .eq("workspace_id", access.workspaceId)
        .eq("interaction_id", opportunity.interactionId)
        .eq("creator_event_id", opportunity.creatorEventId)
        .order("created_at", { ascending: false }),
    ]);
    const queryError = [interactionResult, sourceResult, actionsResult].find((result) => result.error)?.error;
    if (queryError) throw new YouTubeIntegrationError("storage_error", 500, queryError.message);
    const interaction = interactionResult.data;
    const source = sourceResult.data;
    const actions = actionsResult.data ?? [];
    if (!interaction || !source) throw new YouTubeIntegrationError("invalid_request", 400);

    const gate = evaluateReplyPostingGate(opportunity, actions);
    if (!gate.allowed && gate.code) throw new YouTubeIntegrationError(gate.code, gate.code === "approval_required" ? 403 : 409);
    if (!gate.approvedText || gate.approvedText !== replyText) {
      throw new YouTubeIntegrationError("invalid_request", 400);
    }
    if (interaction.platform !== "youtube" || interaction.parent_interaction_id || !interaction.external_id) {
      throw new YouTubeIntegrationError("reply_not_supported", 422);
    }
    if (source.platform !== "youtube") throw new YouTubeIntegrationError("reply_not_supported", 422);

    const connection = await getYouTubeConnection(creator.id);
    if (!connection) throw new YouTubeIntegrationError("connection_missing", 400);

    const reservedAt = new Date().toISOString();
    const reservation = await recordCreatorAction({
      creator_id: creator.id,
      audience_member_id: opportunity.audienceMemberId,
      interaction_id: opportunity.interactionId,
      creator_event_id: opportunity.creatorEventId,
      action_type: "reply",
      status: "pending",
      text: replyText,
      metadata: {
        audience_member_id: opportunity.audienceMemberId,
        opportunity_id: opportunity.id,
        parent_comment_id: interaction.external_id,
        posted_at: null,
        posting_status: "posting",
        reply_text: replyText,
        source_id: source.id,
        source_video_id: source.external_id,
        reserved_at: reservedAt,
      },
    });
    if (reservation.error || !reservation.data) {
      if (reservation.error?.includes("creator_actions_reply_reservation_unique_idx") || reservation.error?.includes("23505")) {
        throw new YouTubeIntegrationError("reply_posting_in_progress", 409);
      }
      throw new YouTubeIntegrationError("storage_error", 500, reservation.error ?? "Reply reservation could not be saved.");
    }
    reservationId = reservation.data.id;

    const posted = await insertYouTubeReply(connection, interaction.external_id, replyText);
    externalPostSucceeded = true;
    const postedAt = new Date().toISOString();
    const proofMetadata = {
      audience_member_id: opportunity.audienceMemberId,
      opportunity_id: opportunity.id,
      parent_comment_id: posted.parentCommentId,
      posted_at: postedAt,
      posting_status: "posted",
      reply_text: posted.replyText,
      source_id: source.id,
      source_video_id: source.external_id,
      youtube_reply_id: posted.replyId,
    };
    const savedProof = await updateCreatorAction(reservationId, {
      status: "completed",
      completed_at: postedAt,
      text: posted.replyText,
      metadata: proofMetadata,
    }, creator.id);
    if (savedProof.error || !savedProof.data) {
      throw new YouTubeIntegrationError("reply_proof_storage_error", 500);
    }

    return NextResponse.json({
      posted: true,
      proof: {
        opportunityId: opportunity.id,
        parentCommentId: posted.parentCommentId,
        youtubeReplyId: posted.replyId,
        replyText: posted.replyText,
        postedAt,
        sourceVideoId: source.external_id,
        sourceId: source.id,
        audienceMemberId: opportunity.audienceMemberId,
      },
    });
  } catch (error) {
    const safeError = toYouTubeIntegrationError(error, "invalid_request");
    if (reservationId && currentCreatorId && !externalPostSucceeded) {
      await updateCreatorAction(reservationId, {
        status: "failed",
        completed_at: new Date().toISOString(),
        metadata: {
          posting_status: "failed",
          error_code: safeError.code,
        },
      }, currentCreatorId);
    }
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: safeError.status },
    );
  }
}
