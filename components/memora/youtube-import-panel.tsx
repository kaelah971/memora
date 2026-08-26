"use client";

import { useState } from "react";
import Image from "next/image";

import type { YouTubeImportSummary, YouTubeVideo } from "@/lib/youtube/types";
import {
  createYouTubeImportRequest,
  getImportButtonState,
  getSafeYouTubeApiError,
  getYouTubeImportSummaryItems,
} from "@/lib/youtube/import-ui";

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & { error?: unknown }) | null;
  if (!response.ok) {
    throw new Error(getSafeYouTubeApiError(body));
  }
  if (!body) throw new Error("The YouTube response was empty.");
  return body;
}

export function YouTubeImportPanel() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [summary, setSummary] = useState<YouTubeImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [importing, setImporting] = useState(false);
  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? null;

  async function loadVideos() {
    setLoadingVideos(true);
    setError(null);
    setSummary(null);
    setSelectedVideoId(null);
    try {
      const response = await fetch("/api/youtube/videos?limit=20", { cache: "no-store" });
      const body = await readApiResponse<{ videos: YouTubeVideo[] }>(response);
      if (!Array.isArray(body.videos)) throw new Error("The YouTube video response was invalid.");
      setVideos(body.videos);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Videos could not be loaded.");
    } finally {
      setLoadingVideos(false);
    }
  }

  async function importComments() {
    const videoId = selectedVideoId;
    if (!videoId) {
      setError("Select a video before importing comments.");
      return;
    }

    setImporting(true);
    setError(null);
    setSummary(null);
    try {
      const request = createYouTubeImportRequest(videoId);
      const response = await fetch(request.endpoint, request.options);
      const body = await readApiResponse<{ summary: YouTubeImportSummary }>(response);
      setSummary(body.summary);
      setVideos((current) => current.map((video) =>
        video.id === videoId ? { ...video, imported: true } : video,
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Comments could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  const importButton = getImportButtonState(selectedVideoId, importing);

  return (
    <section className="youtube-import" aria-labelledby="youtube-import-title" aria-busy={importing}>
      <div className="youtube-import__heading">
        <div>
          <span className="section-label">SELECT A VIDEO</span>
          <h2 id="youtube-import-title">Choose one source of conversation.</h2>
          <p>Memora checks the connected channel again before importing. The first pass is capped at 100 top-level comments.</p>
        </div>
        <button className="primary-button" type="button" onClick={loadVideos} disabled={loadingVideos}>
          {loadingVideos ? "FETCHING…" : "FETCH VIDEOS"}
        </button>
      </div>

      {error ? <p className="youtube-import__error" role="alert">{error}</p> : null}
      <div className="youtube-import__status" aria-live="polite">
        {loadingVideos
          ? "Reading recent videos from YouTube…"
          : importing
            ? `Importing comments${selectedVideo ? ` from “${selectedVideo.title}”` : ""}…`
            : selectedVideo
              ? `Selected: ${selectedVideo.title}`
              : videos.length
                ? `${videos.length} recent videos found. Select one to import its comments.`
                : "No videos fetched yet."}
      </div>

      {videos.length ? (
        <ul className="youtube-video-list">
          {videos.map((video) => (
            <li key={video.id}>
              <label
                className={`youtube-video${selectedVideoId === video.id ? " youtube-video--selected" : ""}`}
                htmlFor={`youtube-video-${video.id}`}
                data-video-id={video.id}
                aria-disabled={importing}
              >
                <input
                  className="youtube-video__radio sr-only"
                  id={`youtube-video-${video.id}`}
                  name="youtube-video"
                  type="radio"
                  value={video.id}
                  checked={selectedVideoId === video.id}
                  onChange={() => {
                    setSelectedVideoId(video.id);
                    setSummary(null);
                    setError(null);
                  }}
                  disabled={importing}
                />
                {video.thumbnailUrl ? (
                  <Image src={video.thumbnailUrl} alt="" width={320} height={180} />
                ) : (
                  <span className="youtube-video__placeholder" aria-hidden="true" />
                )}
                <span className="youtube-video__body">
                  <strong>{video.title}</strong>
                  <span>{formatDate(video.publishedAt)}</span>
                  <span className="data-label">
                    {video.id} / {video.commentCount == null ? "COMMENT COUNT UNAVAILABLE" : `${video.commentCount} COMMENTS`}
                  </span>
                </span>
                <span className={`state-sticker ${video.imported ? "state-sticker--remembered" : "state-sticker--open"}`}>
                  {video.imported ? "IMPORTED" : "READY"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="youtube-import__actions">
        <button
          className="primary-button"
          type="button"
          onClick={importComments}
          disabled={importButton.disabled}
          aria-busy={importing}
        >
          {importButton.label}
        </button>
        <a className="secondary-link" href="/app/memory">VIEW AUDIENCE HISTORY <span aria-hidden="true">→</span></a>
      </div>

      {summary ? (
        <section className="youtube-import-summary" aria-labelledby="youtube-import-summary-title" role="status">
          <span className="section-label">IMPORT COMPLETE</span>
          <h3 id="youtube-import-summary-title">The source facts are in Memora.</h3>
          <div className="youtube-import-summary__counts">
            {getYouTubeImportSummaryItems(summary).map((item) => (
              <span key={item.key}><strong>{item.value}</strong> {item.label}</span>
            ))}
          </div>
          <span className="data-label">{summary.pagesFetched} API page{summary.pagesFetched === 1 ? "" : "s"} read / no replies posted</span>
        </section>
      ) : null}
    </section>
  );
}
