import type { youtube_v3 } from "googleapis";

import { createAuthenticatedYouTubeClient } from "@/lib/youtube/client";
import { hasYouTubeCommentScope } from "@/lib/youtube/config";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import type { YouTubeConnectionRecord } from "@/lib/youtube/types";

export const YOUTUBE_REPLY_MAX_LENGTH = 4_000;

export interface PostedYouTubeReply {
  replyId: string;
  parentCommentId: string;
  replyText: string;
}

export function validateYouTubeReplyText(value: unknown): string {
  if (typeof value !== "string") throw new YouTubeIntegrationError("invalid_request", 400);
  const replyText = value.trim();
  if (!replyText || replyText.length > YOUTUBE_REPLY_MAX_LENGTH) {
    throw new YouTubeIntegrationError("invalid_request", 400);
  }
  return replyText;
}

export async function insertYouTubeReply(
  connection: YouTubeConnectionRecord,
  parentCommentId: string,
  replyText: string,
): Promise<PostedYouTubeReply> {
  if (!parentCommentId.trim()) throw new YouTubeIntegrationError("invalid_request", 400);
  if (!hasYouTubeCommentScope(connection.scopes)) throw new YouTubeIntegrationError("auth_required", 401);

  try {
    const { youtube } = await createAuthenticatedYouTubeClient(connection);
    const response = await youtube.comments.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          parentId: parentCommentId,
          textOriginal: replyText,
        },
      },
    });
    const replyId = response.data.id;
    if (!replyId) throw new YouTubeIntegrationError("api_error", 502);
    return { replyId, parentCommentId, replyText };
  } catch (error) {
    if (error instanceof YouTubeIntegrationError) throw error;
    throw toYouTubeIntegrationError(error);
  }
}

export type YouTubeCommentsClient = Pick<youtube_v3.Youtube, "comments">;

export async function insertYouTubeReplyWithClient(
  youtube: YouTubeCommentsClient,
  parentCommentId: string,
  replyText: string,
): Promise<PostedYouTubeReply> {
  const response = await youtube.comments.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        parentId: parentCommentId,
        textOriginal: replyText,
      },
    },
  });
  const replyId = response.data.id;
  if (!replyId) throw new YouTubeIntegrationError("api_error", 502);
  return { replyId, parentCommentId, replyText };
}
