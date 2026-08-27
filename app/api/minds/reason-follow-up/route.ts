import { NextResponse } from "next/server";
import type { MindsClient } from "@animocabrands/minds-client-lib";

import { getDevelopmentCreator } from "@/lib/youtube/server";
import { listFollowUpOpportunities } from "@/lib/data/follow-up-opportunities";
import { upsertMindReasoning } from "@/lib/data/mind-reasoning";
import { createAuthenticatedMindsClient } from "@/lib/minds/client";
import { readMindsConfig } from "@/lib/minds/config";
import { MindsIntegrationError, toMindsErrorInfo } from "@/lib/minds/errors";
import {
  buildFollowUpReasoningPrompt,
  findReasoningOpportunity,
  parseMindReasoningResponse,
  toFollowUpMindReasoning,
} from "@/lib/minds/follow-up-reasoning";
import { sendAndPollForMindReply } from "@/lib/minds/reply";
import { normalizeCreatorVoice } from "@/types/data";
import { getCurrentWorkspaceContext, getWorkspaceMindAlias } from "@/lib/workspaces/access";

interface ReasonFollowUpBody {
  opportunityId?: unknown;
  interactionId?: unknown;
}

function safeIdentifier(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

function errorStatus(code: string, status: number | null): number {
  if (status && status >= 400 && status < 600) return status;
  if (code === "CONFIGURATION") return 503;
  if (code === "TIMEOUT") return 504;
  if (code === "STORAGE") return 500;
  return 502;
}

async function verifyConfiguredMind(client: MindsClient, mindId: string, alias: string): Promise<string> {
  const mind = await client.getMind(mindId);
  if (mind.isEnabled === false) {
    throw new MindsIntegrationError("API", "The configured Memora Mind is disabled.", { status: 503 });
  }

  const conversation = await client.ensureConversation(alias, mindId);
  const resolvedMindId = await client.getMindIdForAlias(alias);
  if (resolvedMindId && resolvedMindId !== mindId) {
    throw new MindsIntegrationError("API", "The configured Memora Mind alias resolved to a different Mind.", { status: 409 });
  }
  return conversation.conversationId;
}

export async function POST(request: Request) {
  let builderApiKey: string | undefined;

  try {
    const body = (await request.json()) as ReasonFollowUpBody;
    const opportunityId = safeIdentifier(body.opportunityId, 300);
    const interactionId = safeIdentifier(body.interactionId, 100);
    if (!opportunityId && !interactionId) {
      throw new MindsIntegrationError("API", "A follow-up opportunity identifier is required.", { status: 400 });
    }

    const creator = await getDevelopmentCreator();
    const workspaceContext = await getCurrentWorkspaceContext();
    if (!workspaceContext.data) {
      throw new MindsIntegrationError("STORAGE", "Memora could not resolve the active workspace.", { status: 500 });
    }
    const queueResult = await listFollowUpOpportunities(creator.id);
    if (queueResult.error || !queueResult.access.available) {
      throw new MindsIntegrationError("STORAGE", "Memora could not load the source-backed opportunity.", { status: 500 });
    }
    const opportunity = findReasoningOpportunity(queueResult.data.opportunities, opportunityId, interactionId);
    if (!opportunity) {
      throw new MindsIntegrationError("API", "That source-backed follow-up opportunity was not found.", { status: 404 });
    }

    const config = readMindsConfig();
    builderApiKey = config.builderApiKey;
    const client = createAuthenticatedMindsClient(config);
    const conversationAlias = getWorkspaceMindAlias(workspaceContext.data.workspace);
    const conversationId = await verifyConfiguredMind(client, config.mindId, conversationAlias);
    const prompt = buildFollowUpReasoningPrompt(opportunity, normalizeCreatorVoice(creator.voice_preference));
    const capture = await sendAndPollForMindReply(client, conversationAlias, prompt);
    if (!capture.response) {
      throw new MindsIntegrationError("TIMEOUT", "Memora Mind did not return reasoning before the safe timeout.", { status: 504 });
    }

    const parsed = parseMindReasoningResponse(
      capture.response,
      Boolean(opportunity.postedReply),
      opportunity.creatorEventVideoUrl,
    );
    const saved = await upsertMindReasoning({
      creator_id: creator.id,
      opportunity_id: opportunity.id,
      interaction_id: opportunity.interactionId,
      mind_id: config.mindId,
      conversation_id: conversationId,
      reasoning_text: parsed.reasoningText,
      tone: parsed.tone,
        variants: {
          warm: parsed.variants.warm,
          short: parsed.variants.short,
          beginner_friendly: parsed.variants.beginnerFriendly,
          advisory: {
            fan_question: parsed.advisory.fanQuestion,
            source_context: parsed.advisory.sourceContext,
            likely_need: parsed.advisory.likelyNeed,
            recommended_action: parsed.advisory.recommendedAction,
            reply_now: parsed.advisory.replyNow,
            follow_up_outline: parsed.advisory.followUpOutline,
            attached_video_status: parsed.advisory.attachedVideoStatus,
          },
        },
    });
    if (saved.error || !saved.data) {
      throw new MindsIntegrationError("STORAGE", "Memora could not save the Mind reasoning.", { status: 500 });
    }

    return NextResponse.json({
      reasoning: toFollowUpMindReasoning(saved.data),
      conversationId,
      generatedBy: "Memora Mind",
      advisoryOnly: true,
    });
  } catch (error) {
    const diagnostic = toMindsErrorInfo(error, builderApiKey);
    return NextResponse.json(
      { error: diagnostic.message, code: diagnostic.code },
      { status: errorStatus(diagnostic.code, diagnostic.status) },
    );
  }
}
