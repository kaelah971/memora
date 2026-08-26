import { normalizeYouTubeVideo } from "@/lib/youtube/normalize";
import { createAuthenticatedYouTubeClient } from "@/lib/youtube/client";
import { YouTubeIntegrationError, toYouTubeIntegrationError } from "@/lib/youtube/errors";
import { getImportedVideoIds, getYouTubeConnection } from "@/lib/youtube/storage";
import type { YouTubeVideo } from "@/lib/youtube/types";
import { YOUTUBE_VIDEO_LIST_LIMIT } from "@/lib/youtube/config";

async function getOwnedChannel(
  youtube: Awaited<ReturnType<typeof createAuthenticatedYouTubeClient>>["youtube"],
  channelId: string,
) {
  const response = await youtube.channels.list({
    id: [channelId],
    maxResults: 1,
    part: ["snippet", "contentDetails"],
  });
  const channel = response.data.items?.[0];
  if (!channel?.id || channel.id !== channelId || !channel.snippet?.title) {
    throw new YouTubeIntegrationError("channel_missing", 422);
  }
  return channel;
}

export async function listRecentYouTubeVideos(
  creatorId: string,
  requestedLimit = YOUTUBE_VIDEO_LIST_LIMIT,
): Promise<YouTubeVideo[]> {
  const connection = await getYouTubeConnection(creatorId);
  if (!connection) throw new YouTubeIntegrationError("connection_missing", 400);

  try {
    const { youtube } = await createAuthenticatedYouTubeClient(connection);
    const channel = await getOwnedChannel(youtube, connection.youtube_channel_id);
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) return [];

    const limit = Math.max(1, Math.min(requestedLimit, YOUTUBE_VIDEO_LIST_LIMIT));
    const playlistResponse = await youtube.playlistItems.list({
      maxResults: limit,
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
    });
    const videoIds = (playlistResponse.data.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id));
    if (videoIds.length === 0) return [];

    const videosResponse = await youtube.videos.list({
      id: videoIds,
      maxResults: videoIds.length,
      part: ["snippet", "statistics"],
    });
    const normalized = (videosResponse.data.items ?? [])
      .map(normalizeYouTubeVideo)
      .filter((video): video is YouTubeVideo => Boolean(video));
    const imported = await getImportedVideoIds(creatorId, normalized.map((video) => video.id));
    return normalized.map((video) => ({ ...video, imported: imported.has(video.id) }));
  } catch (error) {
    throw toYouTubeIntegrationError(error);
  }
}

export async function getOwnedYouTubeVideo(creatorId: string, videoId: string): Promise<YouTubeVideo> {
  const connection = await getYouTubeConnection(creatorId);
  if (!connection) throw new YouTubeIntegrationError("connection_missing", 400);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(videoId)) {
    throw new YouTubeIntegrationError("invalid_request", 400);
  }

  try {
    const { youtube } = await createAuthenticatedYouTubeClient(connection);
    const response = await youtube.videos.list({
      id: [videoId],
      maxResults: 1,
      part: ["snippet", "statistics"],
    });
    const video = response.data.items?.map(normalizeYouTubeVideo).find(Boolean);
    if (!video || video.channelId !== connection.youtube_channel_id) {
      throw new YouTubeIntegrationError("video_missing", 404);
    }
    const imported = await getImportedVideoIds(creatorId, [video.id]);
    return { ...video, imported: imported.has(video.id) };
  } catch (error) {
    throw toYouTubeIntegrationError(error, "video_missing");
  }
}
