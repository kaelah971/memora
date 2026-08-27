import assert from "node:assert/strict";
import test from "node:test";

import { decryptYouTubeToken } from "../../lib/youtube/tokens";
import { persistYouTubeOAuthConnection, type YouTubeOAuthWorkspaceContext } from "../../lib/youtube/oauth-storage";
import { getYouTubeImportPath, getYouTubeOAuthWorkspaceMode } from "../../lib/youtube/oauth-return";
import type { Tables } from "../../lib/supabase/database.types";
import type { YouTubeConnectionInsert } from "../../lib/youtube/storage";
import { YOUTUBE_OAUTH_STORAGE_ERROR_MESSAGE } from "../../lib/youtube/errors";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

function context(overrides: Partial<YouTubeOAuthWorkspaceContext> = {}): YouTubeOAuthWorkspaceContext {
  return {
    mode: "mine",
    user: { id: "user-1" },
    workspace: { id: "workspace-1" },
    creator: { id: "creator-1" },
    ...overrides,
  };
}

test("OAuth return routing only accepts demo as the non-personal route", () => {
  assert.equal(getYouTubeOAuthWorkspaceMode("demo"), "demo");
  assert.equal(getYouTubeOAuthWorkspaceMode("mine"), "mine");
  assert.equal(getYouTubeOAuthWorkspaceMode("tampered"), "mine");
  assert.equal(getYouTubeImportPath("mine"), "/app/my/import");
  assert.equal(getYouTubeImportPath("demo"), "/app/demo/import");
});

test("authenticated OAuth persistence writes the creator and workspace IDs to My Workspace", async () => {
  let saved: YouTubeConnectionInsert | undefined;
  let savedMode: string | undefined;
  const stages: string[] = [];
  const savedRecord = await persistYouTubeOAuthConnection(
    {
      context: context(),
      channel: { channelId: "channel-1", title: "Creator Channel", handle: "@creator" },
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiryDate: Date.parse("2026-08-27T12:00:00.000Z"),
        scopes: ["https://www.googleapis.com/auth/youtube.force-ssl"],
      },
      tokenEncryptionKey: encryptionKey,
      now: () => new Date("2026-08-27T10:00:00.000Z"),
      onStage: (stage) => stages.push(stage),
    },
    {
      getConnection: async (creatorId, mode) => {
        assert.equal(creatorId, "creator-1");
        assert.equal(mode, "mine");
        return null;
      },
      upsertConnection: async (connection, mode) => {
        saved = connection;
        savedMode = mode;
        return {
          ...connection,
          id: "connection-1",
          created_at: connection.connected_at ?? "",
          updated_at: connection.connected_at ?? "",
        } as Tables<"youtube_connections">;
      },
    },
  );

  assert.equal(savedMode, "mine");
  assert.equal(saved?.workspace_id, "workspace-1");
  assert.equal(saved?.creator_id, "creator-1");
  assert.equal(saved?.connected_at, "2026-08-27T10:00:00.000Z");
  assert.deepEqual(stages, ["database_read", "token_encryption", "database_write"]);
  assert.equal(decryptYouTubeToken(saved?.access_token_ciphertext ?? "", encryptionKey), "access-token");
  assert.equal(decryptYouTubeToken(saved?.refresh_token_ciphertext ?? "", encryptionKey), "refresh-token");
  assert.equal(savedRecord.id, "connection-1");
});

test("authenticated contexts cannot persist a YouTube connection in the demo workspace", async () => {
  await assert.rejects(
    persistYouTubeOAuthConnection(
      {
        context: context({ mode: "demo" }),
        channel: { channelId: "channel-1", title: "Creator Channel", handle: null },
        tokens: { accessToken: "access-token", refreshToken: null, expiryDate: null, scopes: [] },
        tokenEncryptionKey: encryptionKey,
      },
      {
        getConnection: async () => {
          throw new Error("must not read demo storage");
        },
      },
    ),
    (error: unknown) => error instanceof Error
      && "code" in error
      && error.code === "workspace_unavailable",
  );
});

test("anonymous OAuth persistence cannot write a personal connection", async () => {
  await assert.rejects(
    persistYouTubeOAuthConnection(
      {
        context: context({ user: null }),
        channel: { channelId: "channel-1", title: "Creator Channel", handle: null },
        tokens: { accessToken: "access-token", refreshToken: null, expiryDate: null, scopes: [] },
        tokenEncryptionKey: encryptionKey,
      },
      { getConnection: async () => { throw new Error("must not read personal storage"); } },
    ),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "auth_required",
  );
});

test("OAuth storage failures use the required user-facing message", () => {
  assert.equal(
    YOUTUBE_OAUTH_STORAGE_ERROR_MESSAGE,
    "YouTube authorized successfully, but Memora could not save the connection. Check workspace storage configuration.",
  );
});
