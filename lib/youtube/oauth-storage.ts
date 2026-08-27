import { encryptYouTubeToken } from "@/lib/youtube/tokens";
import {
  getYouTubeConnection,
  upsertYouTubeConnection,
  type YouTubeConnectionInsert,
} from "@/lib/youtube/storage";
import type { Tables } from "@/lib/supabase/database.types";
import type { WorkspaceMode } from "@/lib/workspaces/access";
import { YouTubeIntegrationError } from "@/lib/youtube/errors";
import type { ConnectedYouTubeChannel, OAuthTokenSet } from "@/lib/youtube/client";

export type YouTubeOAuthPersistenceStage = "database_read" | "token_encryption" | "database_write";

export interface YouTubeOAuthWorkspaceContext {
  mode: WorkspaceMode;
  user: unknown | null;
  workspace: Pick<Tables<"workspaces">, "id">;
  creator: Pick<Tables<"creators">, "id">;
}

export interface PersistYouTubeOAuthConnectionInput {
  context: YouTubeOAuthWorkspaceContext;
  channel: ConnectedYouTubeChannel;
  tokens: OAuthTokenSet;
  tokenEncryptionKey: string;
  now?: () => Date;
  onStage?: (stage: YouTubeOAuthPersistenceStage) => void;
}

export interface PersistYouTubeOAuthConnectionDependencies {
  encryptToken?: typeof encryptYouTubeToken;
  getConnection?: (creatorId: string, mode: WorkspaceMode) => Promise<Tables<"youtube_connections"> | null>;
  upsertConnection?: (
    connection: YouTubeConnectionInsert,
    mode: WorkspaceMode,
  ) => Promise<Tables<"youtube_connections">>;
}

export async function persistYouTubeOAuthConnection(
  input: PersistYouTubeOAuthConnectionInput,
  dependencies: PersistYouTubeOAuthConnectionDependencies = {},
): Promise<Tables<"youtube_connections">> {
  const { context, channel, tokens, tokenEncryptionKey } = input;
  if (!context.user && context.mode !== "demo") {
    throw new YouTubeIntegrationError("auth_required", 401, "Sign in before connecting a personal YouTube channel.");
  }
  if (context.user && context.mode !== "mine") {
    throw new YouTubeIntegrationError(
      "workspace_unavailable",
      403,
      "Authenticated YouTube connections must be stored in My Workspace.",
    );
  }

  const encryptToken = dependencies.encryptToken ?? encryptYouTubeToken;
  const getConnection = dependencies.getConnection ?? getYouTubeConnection;
  const upsertConnection = dependencies.upsertConnection ?? upsertYouTubeConnection;
  input.onStage?.("database_read");
  const existingConnection = await getConnection(context.creator.id, context.mode);
  const existingRefreshToken = existingConnection?.youtube_channel_id === channel.channelId
    ? existingConnection.refresh_token_ciphertext
    : null;
  const connectedAt = (input.now ?? (() => new Date()))().toISOString();
  input.onStage?.("token_encryption");
  const accessTokenCiphertext = encryptToken(tokens.accessToken, tokenEncryptionKey);
  const refreshTokenCiphertext = tokens.refreshToken
    ? encryptToken(tokens.refreshToken, tokenEncryptionKey)
    : existingRefreshToken;

  input.onStage?.("database_write");
  return upsertConnection(
    {
      workspace_id: context.workspace.id,
      creator_id: context.creator.id,
      google_account_id: null,
      youtube_channel_id: channel.channelId,
      youtube_channel_title: channel.title,
      youtube_channel_handle: channel.handle,
      access_token_ciphertext: accessTokenCiphertext,
      refresh_token_ciphertext: refreshTokenCiphertext,
      token_expires_at: tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : null,
      scopes: tokens.scopes,
      connected_at: connectedAt,
      last_synced_at: null,
    },
    context.mode,
  );
}
