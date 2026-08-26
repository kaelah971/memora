export const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
export const YOUTUBE_FORCE_SSL_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
export const YOUTUBE_OAUTH_SCOPES = [YOUTUBE_FORCE_SSL_SCOPE] as const;
export const YOUTUBE_VIDEO_LIST_LIMIT = 20;
export const YOUTUBE_IMPORT_DEFAULT_LIMIT = 100;
export const YOUTUBE_IMPORT_MAX_LIMIT = 200;

export function hasYouTubeCommentScope(scopes: readonly string[]): boolean {
  return scopes.includes(YOUTUBE_FORCE_SSL_SCOPE);
}

const GOOGLE_CLIENT_ID_ENV = "GOOGLE_CLIENT_ID";
const GOOGLE_CLIENT_SECRET_ENV = "GOOGLE_CLIENT_SECRET";
const GOOGLE_REDIRECT_URI_ENV = "GOOGLE_REDIRECT_URI";
const YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV = "YOUTUBE_TOKEN_ENCRYPTION_KEY";

type Environment = Record<string, string | undefined>;

export interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
}

export interface YouTubeConfigStatus {
  googleConfigured: boolean;
  tokenStorageConfigured: boolean;
  missing: string[];
}

export class YouTubeConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "YouTubeConfigError";
    this.missing = missing;
  }
}

function readValue(environment: Environment, key: string): string | undefined {
  const value = environment[key]?.trim();
  return value || undefined;
}

export function getYouTubeConfigStatus(environment: Environment = process.env): YouTubeConfigStatus {
  const missing = [
    !readValue(environment, GOOGLE_CLIENT_ID_ENV) ? GOOGLE_CLIENT_ID_ENV : null,
    !readValue(environment, GOOGLE_CLIENT_SECRET_ENV) ? GOOGLE_CLIENT_SECRET_ENV : null,
    !readValue(environment, GOOGLE_REDIRECT_URI_ENV) ? GOOGLE_REDIRECT_URI_ENV : null,
  ].filter((key): key is string => Boolean(key));

  return {
    googleConfigured: missing.length === 0,
    tokenStorageConfigured: Boolean(readValue(environment, YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV)),
    missing: [
      ...missing,
      ...(!readValue(environment, YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV)
        ? [YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV]
        : []),
    ],
  };
}

export function readYouTubeConfig(environment: Environment = process.env): YouTubeConfig {
  const clientId = readValue(environment, GOOGLE_CLIENT_ID_ENV);
  const clientSecret = readValue(environment, GOOGLE_CLIENT_SECRET_ENV);
  const redirectUri = readValue(environment, GOOGLE_REDIRECT_URI_ENV);
  const tokenEncryptionKey = readValue(environment, YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV);
  const missing = [
    !clientId ? GOOGLE_CLIENT_ID_ENV : null,
    !clientSecret ? GOOGLE_CLIENT_SECRET_ENV : null,
    !redirectUri ? GOOGLE_REDIRECT_URI_ENV : null,
    !tokenEncryptionKey ? YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV : null,
  ].filter((key): key is string => Boolean(key));

  if (missing.length > 0) {
    throw new YouTubeConfigError(
      `YouTube configuration is incomplete. Missing: ${missing.join(", ")}.`,
      missing,
    );
  }

  try {
    const parsedRedirectUri = new URL(redirectUri as string);
    if (parsedRedirectUri.protocol !== "http:" && parsedRedirectUri.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new YouTubeConfigError(`${GOOGLE_REDIRECT_URI_ENV} must be a valid HTTP(S) URL.`, [
      GOOGLE_REDIRECT_URI_ENV,
    ]);
  }

  return {
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    redirectUri: redirectUri as string,
    tokenEncryptionKey: tokenEncryptionKey as string,
  };
}

export {
  GOOGLE_CLIENT_ID_ENV,
  GOOGLE_CLIENT_SECRET_ENV,
  GOOGLE_REDIRECT_URI_ENV,
  YOUTUBE_TOKEN_ENCRYPTION_KEY_ENV,
};
