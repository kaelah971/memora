import type { Tables } from "@/lib/supabase/database.types";

export type YouTubeConnectionRecord = Tables<"youtube_connections">;
export type YouTubeConnectionPublic = Omit<
  YouTubeConnectionRecord,
  "access_token_ciphertext" | "refresh_token_ciphertext"
>;

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  channelId: string | null;
  channelTitle: string | null;
  commentCount: number | null;
  imported: boolean;
}

export interface YouTubeCommentFact {
  commentId: string;
  videoId: string;
  authorChannelId: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  authorChannelUrl: string | null;
  text: string;
  publishedAt: string;
  updatedAt: string | null;
  likeCount: number | null;
  replyCount: number | null;
  rawMetadata: Record<string, string | number | boolean | null>;
}

export interface YouTubeImportSummary {
  videoId: string;
  fetched: number;
  inserted: number;
  alreadyKnown: number;
  audienceMembersCreated: number;
  audienceMembersUpdated: number;
  sourceCreated: boolean;
  creatorEventCreated: boolean;
  pagesFetched: number;
}

export type YouTubeTokenState = "valid" | "refreshable" | "expired" | "unavailable";

export interface YouTubeDoctorResult {
  googleConfig: "configured" | "missing";
  tokenStorage: "configured" | "missing";
  connection: "found" | "not found";
  channelId: string | null;
  tokenState: YouTubeTokenState;
  apiConnectivity: "ok" | "fail" | "not checked";
  recentVideos: "ok" | "fail" | "not checked";
}
