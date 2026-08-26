import assert from "node:assert/strict";
import test from "node:test";

import {
  getYouTubeConfigStatus,
  readYouTubeConfig,
  hasYouTubeCommentScope,
  YOUTUBE_FORCE_SSL_SCOPE,
  YOUTUBE_READONLY_SCOPE,
} from "../../lib/youtube/config";
import { getYouTubeAuthorizationUrl } from "../../lib/youtube/client";
import { encryptYouTubeToken, decryptYouTubeToken } from "../../lib/youtube/tokens";
import { createOAuthState, isValidOAuthState } from "../../lib/youtube/state";
import { toYouTubeIntegrationError } from "../../lib/youtube/errors";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

test("YouTube config status does not expose configuration values", () => {
  const status = getYouTubeConfigStatus({
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/youtube/callback",
    YOUTUBE_TOKEN_ENCRYPTION_KEY: encryptionKey,
  });

  assert.deepEqual(status, {
    googleConfigured: true,
    tokenStorageConfigured: true,
    missing: [],
  });
});

test("YouTube config rejects non-HTTP redirect protocols", () => {
  assert.throws(
    () => readYouTubeConfig({
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_REDIRECT_URI: "httpx://localhost/callback",
      YOUTUBE_TOKEN_ENCRYPTION_KEY: encryptionKey,
    }),
    /GOOGLE_REDIRECT_URI must be a valid HTTP\(S\) URL/,
  );
});

test("YouTube OAuth state is one-time-verifiable and tokens decrypt only server-side", () => {
  const state = createOAuthState();
  assert.equal(isValidOAuthState(state, state), true);
  assert.equal(isValidOAuthState(state, `${state}x`), false);

  const ciphertext = encryptYouTubeToken("refresh-token", encryptionKey);
  assert.notEqual(ciphertext, "refresh-token");
  assert.equal(decryptYouTubeToken(ciphertext, encryptionKey), "refresh-token");
});

test("YouTube OAuth URL requests the comment-import scope", () => {
  const previous = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    YOUTUBE_TOKEN_ENCRYPTION_KEY: process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY,
  };

  try {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/youtube/callback";
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY = encryptionKey;

    const url = new URL(getYouTubeAuthorizationUrl("state-value"));
    const scopes = url.searchParams.get("scope")?.split(" ") ?? [];
    assert.equal(scopes.includes(YOUTUBE_FORCE_SSL_SCOPE), true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("legacy read-only connections are insufficient for comment import", () => {
  assert.equal(hasYouTubeCommentScope([YOUTUBE_READONLY_SCOPE]), false);
  assert.equal(hasYouTubeCommentScope([YOUTUBE_FORCE_SSL_SCOPE]), true);
});

test("YouTube scope errors require reconnecting", () => {
  const error = toYouTubeIntegrationError({
    response: {
      status: 403,
      data: {
        error: {
          errors: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }],
        },
      },
    },
  });

  assert.equal(error.code, "auth_required");
  assert.equal(error.status, 401);
});
