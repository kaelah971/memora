# YouTube P1.5 Integration

P1.5 connects one creator-selected YouTube channel, lists a bounded set of recent uploaded videos, and imports public top-level comments as deterministic Memora source facts. It does not run semantic memory, question detection, ranking, recommendations, Minds reasoning, background sync, or comment posting.

## OAuth Scope

The requested Google scope is:

```text
https://www.googleapis.com/auth/youtube.force-ssl
```

YouTube's `commentThreads.list` endpoint requires sufficient authentication for comment reads, so `youtube.force-ssl` replaces the earlier `youtube.readonly` request. Although this is a broader Google permission, Memora only reads channel/video/comment data in P1.5. It does not post replies, edit or delete comments, or manage the channel.

## Environment

Keep these values server-side in `.env.local`:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/youtube/callback
YOUTUBE_TOKEN_ENCRYPTION_KEY=
```

`YOUTUBE_TOKEN_ENCRYPTION_KEY` must be a 32-byte base64 value or a 64-character hexadecimal value. Generate one locally with:

```bash
node --input-type=module -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

The Google client secret and encryption key must never use `NEXT_PUBLIC_*` names or be sent to the browser.

## Token Storage

OAuth access and refresh tokens are encrypted with AES-256-GCM before being stored in `youtube_connections`. The database stores ciphertext, IV, authentication tag, and a version marker in the encrypted value. The encryption key is only read by server-side code.

The table has restrictive RLS and no anonymous or authenticated table grants. Local API routes use the existing `MEMORA_DEV_DB_ACCESS=service_role` gate and the Supabase service-role client. Browser responses only include channel identity, timestamps, scopes, and sync state; token columns are never selected for UI responses.

## Routes

- `GET /api/youtube/connect` creates a short-lived, HttpOnly OAuth state cookie and redirects to Google.
- `GET /api/youtube/callback` validates state, exchanges the code, fetches the actual channel, encrypts tokens, and stores the connection.
- `GET /api/youtube/videos` lists up to 20 recent uploaded videos.
- `POST /api/youtube/import-comments` imports up to 100 comments by default, with a hard maximum of 200.

The current pre-auth P1 workspace resolves the seeded `memora-demo` creator. Production workspace access remains disabled until authentication and creator ownership are implemented.

## Deterministic Import

Each selected video becomes one `sources` row with `platform=youtube`, `source_type=video`, the YouTube video ID, actual title, URL, publish timestamp, thumbnail, channel metadata, and comment count when returned by YouTube.

Each top-level comment becomes one `interactions` row with the original plain-text body, YouTube comment ID, actual publish timestamp, like count, reply count, raw author metadata, and the source ID.

Commenters with an author channel ID use that stable platform identity. When YouTube omits the author ID, Memora stores `platform_user_id=null` and uses a deterministic internal record based on the comment ID. It does not claim that two anonymous comments came from the same person.

The same deterministic IDs and existing P1 uniqueness constraints make imports idempotent. Re-importing updates factual metadata such as counts and timestamps without rewriting the original comment text.

Importing a video also upserts a deterministic `content_published` creator event. It does not trigger follow-up reasoning.

## Quota Boundary

The import flow is explicit and selected-video-only. It lists at most 20 recent videos and reads at most 100 top-level comments by default, traversing comment-thread pages only until the requested bound is reached. The API accepts a bounded maximum up to 200. There is no channel-wide historical scan or background sync.

## Diagnostics

Run:

```bash
npm run youtube:doctor
```

The doctor reports Google configuration, token-storage configuration, connection state, safe channel ID, token state, API connectivity, and the recent-video query. It never prints client secrets, access tokens, or refresh tokens.

## Google Cloud Setup

1. Create or select a Google Cloud project.
2. Enable YouTube Data API v3.
3. Configure the OAuth consent screen for the intended test users or publishing state.
4. Create an OAuth 2.0 Web application client.
5. Register the exact redirect URI `http://localhost:3000/api/youtube/callback` or the deployed equivalent.
6. Put the client ID, client secret, redirect URI, and generated encryption key in local server environment variables.
7. Start Memora, open `/app/import`, and use `CONNECT YOUTUBE`.

Do not claim live YouTube completion until a real channel connection, video listing, and selected-video comment import have succeeded.
