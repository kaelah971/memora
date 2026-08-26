import assert from "node:assert/strict";
import test from "node:test";

import type { youtube_v3 } from "googleapis";

import {
  countKnownYouTubeComments,
  normalizeYouTubeCommentThread,
} from "../../lib/youtube/normalize";

test("YouTube normalization preserves source text and missing counts as null", () => {
  const thread = {
    id: "thread-1",
    snippet: {
      videoId: "video-1",
      topLevelComment: {
        id: "comment-1",
        snippet: {
          videoId: "video-1",
          textOriginal: "Exact source text",
          publishedAt: "2026-08-24T12:00:00.000Z",
          authorChannelId: { value: "channel-1" },
          authorDisplayName: "Viewer",
        },
      },
    },
  } as youtube_v3.Schema$CommentThread;

  assert.deepEqual(normalizeYouTubeCommentThread(thread), {
    commentId: "comment-1",
    videoId: "video-1",
    authorChannelId: "channel-1",
    authorDisplayName: "Viewer",
    authorProfileImageUrl: null,
    authorChannelUrl: null,
    text: "Exact source text",
    publishedAt: "2026-08-24T12:00:00.000Z",
    updatedAt: null,
    likeCount: null,
    replyCount: null,
    rawMetadata: {
      comment_id: "comment-1",
      thread_id: "thread-1",
      video_id: "video-1",
      author_channel_id: "channel-1",
      author_display_name: "Viewer",
      author_channel_url: null,
      author_profile_image_url: null,
      updated_at: null,
      viewer_rating: null,
    },
  });
});

test("YouTube import counts distinguish known comments", () => {
  assert.deepEqual(
    countKnownYouTubeComments(["comment-1", "comment-2", "comment-3"], new Set(["comment-2"])),
    { inserted: 2, alreadyKnown: 1 },
  );
});
