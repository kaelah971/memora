export type YouTubeErrorCode =
  | "config_missing"
  | "token_storage_invalid"
  | "oauth_denied"
  | "invalid_state"
  | "invalid_request"
  | "workspace_unavailable"
  | "connection_missing"
  | "auth_required"
  | "channel_missing"
  | "video_missing"
  | "comments_disabled"
  | "reply_not_supported"
  | "approval_required"
  | "reply_already_posted"
  | "reply_posting_in_progress"
  | "quota_exceeded"
  | "api_error"
  | "storage_error"
  | "reply_proof_storage_error";

export const YOUTUBE_OAUTH_STORAGE_ERROR_MESSAGE = "YouTube authorized successfully, but Memora could not save the connection. Check workspace storage configuration.";

const publicMessages: Record<YouTubeErrorCode, string> = {
  config_missing: "YouTube connection is not configured on this server.",
  token_storage_invalid: "Secure YouTube token storage is not configured correctly.",
  oauth_denied: "YouTube authorization was cancelled.",
  invalid_state: "YouTube authorization could not be verified. Start again.",
  invalid_request: "That YouTube request could not be understood.",
  workspace_unavailable: "The creator workspace is unavailable. For a production hackathon demo, set MEMORA_DEMO_WORKSPACE_ACCESS=enabled on the server.",
  connection_missing: "Connect a YouTube channel before using this import.",
  auth_required: "Reconnect YouTube to continue.",
  channel_missing: "No YouTube channel was available for this Google account.",
  video_missing: "That YouTube video is unavailable or is not owned by the connected channel.",
  comments_disabled: "Comments are disabled for this YouTube video.",
  reply_not_supported: "This YouTube comment cannot accept a reply.",
  approval_required: "Approve this opportunity before posting a YouTube reply.",
  reply_already_posted: "A YouTube reply is already saved for this opportunity.",
  reply_posting_in_progress: "A YouTube reply is already being posted for this opportunity.",
  quota_exceeded: "The YouTube API quota is exhausted. Try again later.",
  api_error: "YouTube could not be reached. Try again.",
  storage_error: "Memora could not save the YouTube source facts.",
  reply_proof_storage_error: "The YouTube reply may have succeeded, but Memora could not save its proof. Do not retry until the queue is checked.",
};

export class YouTubeIntegrationError extends Error {
  readonly code: YouTubeErrorCode;
  readonly status: number;

  constructor(code: YouTubeErrorCode, status = 500, message = publicMessages[code]) {
    super(message);
    this.name = "YouTubeIntegrationError";
    this.code = code;
    this.status = status;
  }
}

export function isYouTubeIntegrationError(error: unknown): error is YouTubeIntegrationError {
  return error instanceof YouTubeIntegrationError;
}

function getGoogleReason(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const response = "response" in error ? error.response : null;
  if (!response || typeof response !== "object") return null;
  const data = "data" in response ? response.data : null;
  if (!data || typeof data !== "object") return null;
  const errors = "error" in data && data.error && typeof data.error === "object" ? data.error : data;
  if (!errors || typeof errors !== "object" || !("errors" in errors) || !Array.isArray(errors.errors)) {
    return null;
  }
  const first = errors.errors[0];
  return first && typeof first === "object" && "reason" in first && typeof first.reason === "string"
    ? first.reason
    : null;
}

function getStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const response = "response" in error ? error.response : null;
  if (response && typeof response === "object" && "status" in response && typeof response.status === "number") {
    return response.status;
  }
  return "code" in error && typeof error.code === "number" ? error.code : null;
}

export function toYouTubeIntegrationError(
  error: unknown,
  fallback: YouTubeErrorCode = "api_error",
): YouTubeIntegrationError {
  if (isYouTubeIntegrationError(error)) return error;

  const status = getStatus(error);
  const reason = getGoogleReason(error)?.toLowerCase() ?? "";
  if (reason.includes("commentsdisabled")) return new YouTubeIntegrationError("comments_disabled", 422);
  if (
    reason.includes("commentthreadnotfound") ||
    reason.includes("commentnotfound") ||
    reason.includes("operationnotsupported") ||
    reason.includes("invalidparent")
  ) return new YouTubeIntegrationError("reply_not_supported", 422);
  if (reason.includes("quota")) return new YouTubeIntegrationError("quota_exceeded", 429);
  if (reason.includes("scope_insufficient") || reason.includes("forbidden")) return new YouTubeIntegrationError("auth_required", 401);
  if (status === 401 || reason.includes("auth")) return new YouTubeIntegrationError("auth_required", 401);
  if (status === 404) return new YouTubeIntegrationError("video_missing", 404);
  return new YouTubeIntegrationError(fallback, status && status >= 400 ? status : 500);
}
