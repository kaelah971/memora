import type { TablesInsert } from "@/lib/supabase/database.types";

import { YOUTUBE_IMPORT_DEFAULT_LIMIT } from "@/lib/youtube/config";
import { fetchYouTubeComments } from "@/lib/youtube/comments";
import { YouTubeIntegrationError } from "@/lib/youtube/errors";
import { deterministicYouTubeUuid } from "@/lib/youtube/ids";
import { countKnownYouTubeComments } from "@/lib/youtube/normalize";
import { getOwnedYouTubeVideo } from "@/lib/youtube/videos";
import {
  getExistingAudienceMembers,
  getExistingCreatorEventIds,
  getExistingInteractionIds,
  getExistingSourceIds,
   getCurrentYouTubeAccess,
  markYouTubeSynced,
} from "@/lib/youtube/storage";
import type { YouTubeCommentFact, YouTubeImportSummary } from "@/lib/youtube/types";

function earlierDate(left: string, right: string): string {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

function laterDate(left: string, right: string): string {
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function audienceIdentity(comment: YouTubeCommentFact): string {
  return comment.authorChannelId ? `channel:${comment.authorChannelId}` : `comment:${comment.commentId}`;
}

export async function importYouTubeVideoComments(
  creatorId: string,
  videoId: string,
  requestedLimit = YOUTUBE_IMPORT_DEFAULT_LIMIT,
): Promise<YouTubeImportSummary> {
  const video = await getOwnedYouTubeVideo(creatorId, videoId);
  const { comments, pagesFetched } = await fetchYouTubeComments(creatorId, videoId, requestedLimit);
  const access = await getCurrentYouTubeAccess(creatorId);
  const client = access.client;
  const workspaceId = access.workspaceId;
  const sourceId = deterministicYouTubeUuid(`source:${creatorId}:youtube:${video.id}`);
  const creatorEventId = deterministicYouTubeUuid(`creator-event:${creatorId}:youtube:${video.id}`);
  const interactionIds = comments.map((comment) =>
    deterministicYouTubeUuid(`interaction:${creatorId}:youtube:${comment.commentId}`),
  );
  const existingInteractions = await getExistingInteractionIds(creatorId, interactionIds);
  const counts = countKnownYouTubeComments(interactionIds, existingInteractions);

  const source: TablesInsert<"sources"> = {
    id: sourceId,
    creator_id: creatorId,
    workspace_id: workspaceId,
    platform: "youtube",
    source_type: "video",
    external_id: video.id,
    title: video.title,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    published_at: video.publishedAt,
    metadata: {
      youtube_video_id: video.id,
      youtube_channel_id: video.channelId,
      youtube_channel_title: video.channelTitle,
      description: video.description,
      thumbnail_url: video.thumbnailUrl,
      comment_count: video.commentCount,
    },
  };
  const existingSources = await getExistingSourceIds(creatorId, [video.id]);
  const sourceResult = await client.from("sources").upsert(source, { onConflict: "id" });
  if (sourceResult.error) throw new YouTubeIntegrationError("storage_error", 500);

  const memberById = new Map<string, TablesInsert<"audience_members">>();
  for (const comment of comments) {
    const id = deterministicYouTubeUuid(`audience:${creatorId}:youtube:${audienceIdentity(comment)}`);
    const existing = memberById.get(id);
    const firstSeen = existing ? earlierDate(existing.first_seen_at, comment.publishedAt) : comment.publishedAt;
    const lastSeen = existing ? laterDate(existing.last_seen_at, comment.publishedAt) : comment.publishedAt;
    memberById.set(id, {
      id,
      creator_id: creatorId,
      workspace_id: workspaceId,
      platform: "youtube",
      platform_user_id: comment.authorChannelId,
      display_name: comment.authorDisplayName ?? "YouTube commenter (identity unavailable)",
      avatar_url: comment.authorProfileImageUrl,
      first_seen_at: firstSeen,
      last_seen_at: lastSeen,
    });
  }

  const memberIds = [...memberById.keys()];
  const existingMembers = await getExistingAudienceMembers(creatorId, memberIds);
  const audienceResult = await client
    .from("audience_members")
    .upsert([...memberById.values()], { onConflict: "id" });
  if (audienceResult.error) throw new YouTubeIntegrationError("storage_error", 500);

  const memberIdByIdentity = new Map<string, string>();
  for (const comment of comments) {
    const memberId = deterministicYouTubeUuid(`audience:${creatorId}:youtube:${audienceIdentity(comment)}`);
    memberIdByIdentity.set(comment.commentId, memberId);
  }

  const interactions: TablesInsert<"interactions">[] = comments.map((comment, index) => ({
    id: interactionIds[index],
    creator_id: creatorId,
    workspace_id: workspaceId,
    audience_member_id: memberIdByIdentity.get(comment.commentId) as string,
    source_id: sourceId,
    platform: "youtube",
    interaction_type: "comment",
    external_id: comment.commentId,
    text: comment.text,
    published_at: comment.publishedAt,
    creator_replied: false,
    parent_interaction_id: null,
    like_count: comment.likeCount,
    reply_count: comment.replyCount,
    raw_metadata: comment.rawMetadata,
  }));
  const interactionResult = await client.from("interactions").upsert(interactions, { onConflict: "id" });
  if (interactionResult.error) throw new YouTubeIntegrationError("storage_error", 500);

  let creatorEventCreated = false;
  if (video.publishedAt) {
    const existingEvents = await getExistingCreatorEventIds(creatorId, [creatorEventId]);
    const creatorEvent: TablesInsert<"creator_events"> = {
      id: creatorEventId,
      creator_id: creatorId,
      workspace_id: workspaceId,
      event_type: "content_published",
      source_id: sourceId,
      external_id: video.id,
      title: video.title,
      description: "A creator-selected YouTube video imported into Memora.",
      occurred_at: video.publishedAt,
      payload: {
        platform: "youtube",
        video_id: video.id,
        channel_id: video.channelId,
        imported_comment_count: comments.length,
      },
    };
    const eventResult = await client.from("creator_events").upsert(creatorEvent, { onConflict: "id" });
    if (eventResult.error) throw new YouTubeIntegrationError("storage_error", 500);
    creatorEventCreated = !existingEvents.has(creatorEventId);
  }

  await markYouTubeSynced(creatorId);
  return {
    videoId: video.id,
    fetched: comments.length,
    inserted: counts.inserted,
    alreadyKnown: counts.alreadyKnown,
    audienceMembersCreated: [...memberById.keys()].filter((id) => !existingMembers.has(id)).length,
    audienceMembersUpdated: [...memberById.keys()].filter((id) => existingMembers.has(id)).length,
    sourceCreated: !existingSources.has(video.id),
    creatorEventCreated,
    pagesFetched,
  };
}
