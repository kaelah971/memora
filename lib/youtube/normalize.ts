import type { youtube_v3 } from "googleapis";

import type { YouTubeCommentFact, YouTubeVideo } from "@/lib/youtube/types";

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeYouTubeVideo(item: youtube_v3.Schema$Video): YouTubeVideo | null {
  if (!item.id || !item.snippet?.title) return null;
  return {
    id: item.id,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt ?? null,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    channelId: item.snippet.channelId ?? null,
    channelTitle: item.snippet.channelTitle ?? null,
    commentCount: numberOrNull(item.statistics?.commentCount),
    imported: false,
  };
}

export function normalizeYouTubeCommentThread(
  thread: youtube_v3.Schema$CommentThread,
): YouTubeCommentFact | null {
  const comment = thread.snippet?.topLevelComment;
  const snippet = comment?.snippet;
  const commentId = comment?.id ?? thread.id;
  if (!commentId || !snippet?.textOriginal || !snippet.publishedAt) return null;

  return {
    commentId,
    videoId: snippet.videoId ?? thread.snippet?.videoId ?? "",
    authorChannelId: snippet.authorChannelId?.value ?? null,
    authorDisplayName: snippet.authorDisplayName ?? null,
    authorProfileImageUrl: snippet.authorProfileImageUrl ?? null,
    authorChannelUrl: snippet.authorChannelUrl ?? null,
    text: snippet.textOriginal,
    publishedAt: snippet.publishedAt,
    updatedAt: snippet.updatedAt ?? null,
    likeCount: numberOrNull(snippet.likeCount),
    replyCount: numberOrNull(thread.snippet?.totalReplyCount),
    rawMetadata: {
      comment_id: commentId,
      thread_id: thread.id ?? null,
      video_id: snippet.videoId ?? thread.snippet?.videoId ?? null,
      author_channel_id: snippet.authorChannelId?.value ?? null,
      author_display_name: snippet.authorDisplayName ?? null,
      author_channel_url: snippet.authorChannelUrl ?? null,
      author_profile_image_url: snippet.authorProfileImageUrl ?? null,
      updated_at: snippet.updatedAt ?? null,
      viewer_rating: snippet.viewerRating ?? null,
    },
  };
}

export function countKnownYouTubeComments(
  commentIds: readonly string[],
  existingIds: ReadonlySet<string>,
): { inserted: number; alreadyKnown: number } {
  const alreadyKnown = commentIds.filter((id) => existingIds.has(id)).length;
  return { inserted: commentIds.length - alreadyKnown, alreadyKnown };
}
