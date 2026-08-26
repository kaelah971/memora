import type { youtube_v3 } from "googleapis";

import { createAuthenticatedYouTubeClient } from "@/lib/youtube/client";
import {
  hasYouTubeCommentScope,
  YOUTUBE_IMPORT_DEFAULT_LIMIT,
  YOUTUBE_IMPORT_MAX_LIMIT,
} from "@/lib/youtube/config";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import { normalizeYouTubeCommentThread } from "@/lib/youtube/normalize";
import { getYouTubeConnection } from "@/lib/youtube/storage";
import type { YouTubeCommentFact } from "@/lib/youtube/types";

export interface YouTubeCommentPageResult {
  comments: YouTubeCommentFact[];
  pagesFetched: number;
}

export async function fetchYouTubeComments(
  creatorId: string,
  videoId: string,
  requestedLimit = YOUTUBE_IMPORT_DEFAULT_LIMIT,
): Promise<YouTubeCommentPageResult> {
  const connection = await getYouTubeConnection(creatorId);
  if (!connection) throw new YouTubeIntegrationError("connection_missing", 400);
  if (!hasYouTubeCommentScope(connection.scopes)) {
    throw new YouTubeIntegrationError("auth_required", 401);
  }
  const limit = Math.max(1, Math.min(requestedLimit, YOUTUBE_IMPORT_MAX_LIMIT));

  try {
    const { youtube } = await createAuthenticatedYouTubeClient(connection);
    const comments: YouTubeCommentFact[] = [];
    let pageToken: string | undefined;
    let pagesFetched = 0;

    do {
      const response = await youtube.commentThreads.list({
        maxResults: Math.min(100, limit - comments.length),
        pageToken,
        part: ["snippet"],
        textFormat: "plainText",
        videoId,
      });
      pagesFetched += 1;
      for (const item of response.data.items ?? []) {
        const normalized = normalizeYouTubeCommentThread(item as youtube_v3.Schema$CommentThread);
        if (normalized && normalized.videoId === videoId) comments.push(normalized);
        if (comments.length >= limit) break;
      }
      pageToken = response.data.nextPageToken ?? undefined;
    } while (comments.length < limit && Boolean(pageToken));

    return { comments, pagesFetched };
  } catch (error) {
    throw toYouTubeIntegrationError(error);
  }
}
