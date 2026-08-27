import assert from "node:assert/strict";
import test from "node:test";

import { decryptYouTubeToken } from "../../lib/youtube/tokens";
import { persistYouTubeOAuthConnection, type YouTubeOAuthWorkspaceContext } from "../../lib/youtube/oauth-storage";
import { getYouTubeImportPath, getYouTubeOAuthWorkspaceMode } from "../../lib/youtube/oauth-return";
import type { Tables } from "../../lib/supabase/database.types";
import { YOUTUBE_CONNECTION_UPSERT_CONFLICT_TARGET, type YouTubeConnectionInsert } from "../../lib/youtube/storage";
import { YOUTUBE_OAUTH_STORAGE_ERROR_MESSAGE } from "../../lib/youtube/errors";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

test("YouTube connection uniqueness is scoped by workspace", async () => {
  assert.equal(YOUTUBE_CONNECTION_UPSERT_CONFLICT_TARGET, "workspace_id,youtube_channel_id");

  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const migration = readFileSync(
    path.join(projectRoot, "supabase", "migrations", "20260827000002_scope_youtube_connection_uniqueness.sql"),
    "utf8",
  );
  assert.match(migration, /drop index if exists public\.youtube_connections_channel_unique_idx/);
  assert.match(migration, /create unique index youtube_connections_workspace_channel_unique_idx/);
  assert.match(migration, /on public\.youtube_connections \(workspace_id, youtube_channel_id\)/);
});

test("demo and personal workspaces can save the same channel without sharing rows", async () => {
  const rows = new Map<string, Tables<"youtube_connections">>();
  const getConnection = async (creatorId: string, mode: "mine" | "demo") => {
    return [...rows.values()].find((row) => row.creator_id === creatorId && (mode === "demo"
      ? row.workspace_id === "demo-workspace"
      : row.workspace_id === "personal-workspace")) ?? null;
  };
  const upsertConnection = async (connection: YouTubeConnectionInsert) => {
    const key = `${connection.workspace_id}:${connection.youtube_channel_id}`;
    const existing = rows.get(key);
    const record = {
      ...connection,
      id: existing?.id ?? `connection-${rows.size + 1}`,
      created_at: existing?.created_at ?? connection.connected_at ?? "",
      updated_at: connection.connected_at ?? "",
    } as Tables<"youtube_connections">;
    rows.set(key, record);
    return record;
  };
  const input = {
    channel: { channelId: "shared-channel", title: "Shared Channel", handle: "@shared" },
    tokens: { accessToken: "access-token", refreshToken: null, expiryDate: null, scopes: [] },
    tokenEncryptionKey: encryptionKey,
  };

  await persistYouTubeOAuthConnection({
    ...input,
    context: context({
      mode: "demo",
      user: null,
      workspace: { id: "demo-workspace" },
      creator: { id: "demo-creator" },
    }),
  }, { getConnection, upsertConnection });
  assert.equal(await getConnection("personal-creator", "mine"), null);

  await persistYouTubeOAuthConnection({
    ...input,
    context: context({
      workspace: { id: "personal-workspace" },
      creator: { id: "personal-creator" },
    }),
  }, { getConnection, upsertConnection });

  assert.equal(rows.size, 2);
  assert.equal((await getConnection("demo-creator", "demo"))?.workspace_id, "demo-workspace");
  assert.equal((await getConnection("personal-creator", "mine"))?.workspace_id, "personal-workspace");
  assert.equal((await getConnection("personal-creator", "mine"))?.youtube_channel_id, "shared-channel");
});

test("reconnecting the same workspace channel updates its existing row", async () => {
  const rows = new Map<string, Tables<"youtube_connections">>();
  const dependencies = {
    getConnection: async (creatorId: string) => [...rows.values()].find((row) => row.creator_id === creatorId) ?? null,
    upsertConnection: async (connection: YouTubeConnectionInsert) => {
      const key = `${connection.workspace_id}:${connection.youtube_channel_id}`;
      const existing = rows.get(key);
      const record = {
        ...connection,
        id: existing?.id ?? "connection-1",
        created_at: existing?.created_at ?? connection.connected_at ?? "",
        updated_at: connection.connected_at ?? "",
      } as Tables<"youtube_connections">;
      rows.set(key, record);
      return record;
    },
  };
  const base = {
    context: context(),
    channel: { channelId: "same-channel", title: "Original Title", handle: null },
    tokens: { accessToken: "access-token", refreshToken: null, expiryDate: null, scopes: [] },
    tokenEncryptionKey: encryptionKey,
  };

  const first = await persistYouTubeOAuthConnection(base, dependencies);
  const second = await persistYouTubeOAuthConnection({
    ...base,
    channel: { ...base.channel, title: "Updated Title" },
  }, dependencies);

  assert.equal(rows.size, 1);
  assert.equal(first.id, second.id);
  assert.equal(second.youtube_channel_title, "Updated Title");
});
