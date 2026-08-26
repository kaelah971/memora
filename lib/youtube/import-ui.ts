import type { YouTubeImportSummary } from "@/lib/youtube/types";

export const YOUTUBE_IMPORT_ENDPOINT = "/api/youtube/import-comments";
export const YOUTUBE_IMPORT_COMMENT_LIMIT = 100;

export function getImportButtonState(
  selectedVideoId: string | null,
  importing: boolean,
): { disabled: boolean; label: "IMPORT COMMENTS" | "IMPORTING…" } {
  return {
    disabled: !selectedVideoId || importing,
    label: importing ? "IMPORTING…" : "IMPORT COMMENTS",
  };
}

export function createYouTubeImportRequest(videoId: string): {
  endpoint: string;
  options: RequestInit;
} {
  return {
    endpoint: YOUTUBE_IMPORT_ENDPOINT,
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId, maxComments: YOUTUBE_IMPORT_COMMENT_LIMIT }),
    },
  };
}

export function getSafeYouTubeApiError(body: unknown): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "The YouTube request failed.";
}

export function getYouTubeImportSummaryItems(summary: YouTubeImportSummary): Array<{
  key: string;
  value: number;
  label: string;
}> {
  return [
    { key: "fetched", value: summary.fetched, label: "fetched" },
    { key: "inserted", value: summary.inserted, label: "new comments added" },
    { key: "already-known", value: summary.alreadyKnown, label: "already known" },
    { key: "audience-created", value: summary.audienceMembersCreated, label: "audience members created" },
    { key: "audience-updated", value: summary.audienceMembersUpdated, label: "audience members updated" },
  ];
}
