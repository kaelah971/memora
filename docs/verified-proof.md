# Verified Milestone Proof

## Milestone

**Memora P8 Mind-guided Discord onboarding + P7 connection + P6 community memory + live Mind reasoning + safe reply posting proof**

This document records the verified integration state for the Discord and YouTube/Supabase audience-data paths, creator-approved YouTube reply path, and Minds persistent-conversation continuity proof. It contains identifiers and safe diagnostic results only. It does not contain API keys, OAuth tokens, refresh tokens, client secrets, encryption keys, or private environment values.

## Verified State

### YouTube and Supabase

- YouTube OAuth connected successfully.
- Google configuration is present and server-side.
- Encrypted token storage is configured.
- A YouTube connection was found.
- The stored token state is refreshable.
- YouTube API connectivity is working.
- The recent-videos query is working.
- Real public YouTube comments were imported from the Kaelah channel.
- `/app/memory` shows source-backed audience records from the imported data.
- `db:doctor` passed with every required table healthy, including `youtube_connections`.
- A real creator-confirmed YouTube reply is persisted with its reply ID and parent comment proof.

The P1.5 import is bounded and source-backed. Imported comments retain their original text and platform metadata; the proof does not claim AI-generated memory or automated comment posting.

### Read-only Discord import

- Discord configuration is present server-side for the Memora Community Demo guild.
- `discord:doctor` passed: bot access, guild access, both monitored channels, and message content readability were verified.
- `POST /api/discord/import` reads only the configured `#creator-questions` and `#announcements` channels.
- The first live import read 4 messages: 3 from `#creator-questions` and 1 from `#announcements`.
- The first live import created 3 audience members and 1 creator event.
- The second identical import created 0 new message rows and reported all 4 messages as already known.
- Discord rows are persisted with stable message external IDs and deterministic row identities.
- Discord messages remain read-only source facts; the importer does not post, moderate, or reply in Discord.
- `/app/memory`, `/app/follow-up`, and `/app/proof` rendered successfully after the import.
- The persisted Discord data produced 1 `real-discord` follow-up opportunity with `needs_review` and `draft_only` status.

### P7 Discord connection foundation

- `20260826020000_create_discord_connections.sql` and `20260826030000_grant_discord_connections_service_role.sql` are applied remotely.
- `db:doctor` reports `discord_connections: ok`.
- The connection row stores one creator connection, guild metadata, nullable installing user ID, selected channel IDs, timestamps, and `last_import_at`.
- `/api/discord/connect` builds the advanced bot authorization URL with `bot applications.commands`, `permissions=68608` (View Channels, Read Message History, Send Messages), `integration_type=0`, and the configured callback URI.
- OAuth state uses a random HTTP-only cookie and timing-safe comparison. OAuth code exchange uses server-side Basic client authentication; access and refresh tokens are not persisted.
- The callback verifies the returned guild through the configured bot token before persisting the connection.
- `/api/discord/channels` lists only text and announcement channels returned by the connected guild endpoint. `/api/discord/save-channels` validates selections against that server response before persistence.
- `/api/discord/import` prefers persisted guild/channel selections and retains the env-configured developer fallback when no user connection exists.
- Local route smoke checks passed: `/app/import/discord` returned 200, `/api/discord/connect` returned the expected Discord authorization redirect, and `/api/discord/channels` returned the expected no-connection response.
- External OAuth completion, channel persistence through a real Discord install, and a saved-channel import have not yet been manually verified.

### Multi-source proof and creator voice

- `/app/proof` counts the complete multi-source queue independently of its representative card.
- The persisted YouTube proof is still visible after Discord import with `POSTED TO YOUTUBE`, the YouTube reply ID, posted timestamp, opportunity ID, and original source comment.
- The live proof surface currently shows 3 total opportunities, 1 needs review, 1 dismissed, 1 posted to YouTube, and 1 Discord opportunity.
- Creator voice is persisted on the creator workspace with a safe `warm` default.
- Supported voice preferences are Warm, Direct, Beginner-friendly, Professional, and Playful.
- The selected voice shapes deterministic drafts and is included in future Mind prompts without changing source facts, creator approval, or final confirmation requirements.

### Creator-approved YouTube replies

- `POST /api/youtube/post-reply` accepts an opportunity ID or interaction ID plus reply text.
- The route resolves the opportunity, parent interaction, and source on the server for the current creator workspace.
- Only the latest persisted `follow_up` action with status `approved` can pass the posting gate.
- The submitted text must match the persisted approved draft exactly after trimming.
- Replies use `comments.insert` with the imported top-level comment's `external_id` as `snippet.parentId`.
- A pending reservation is written before the external call; completed proof is written only after YouTube returns a reply ID.
- A partial unique index prevents concurrent pending/completed reply reservations for the same interaction and creator event.
- Duplicate, in-progress, unsupported, unapproved, and proof-storage failure states return safe public errors.
- The follow-up queue and `/app/proof` show `POSTED TO YOUTUBE` only when persisted proof contains the YouTube reply ID and parent comment ID.

### Live Mind reasoning

- `POST /api/minds/reason-follow-up` accepts only an opportunity ID and optional interaction ID.
- The server resolves the opportunity and all source-backed facts from Supabase before building the prompt.
- Mind reasoning is stored in `follow_up_mind_reasoning`, separate from creator approval and reply actions.
- The configured Memora Mind was used for live reasoning:
  - Mind ID: `55ce4f3e-f36b-1410-8466-00039ce7df11`
  - Conversation ID: `1abb503e-f36b-1410-8466-00039ce7df11`
- `/app/follow-up` displays persisted reasoning, suggested tone, optional variants, and the source-grounded advisory label after refresh.
- Mind output cannot claim a reply was posted unless deterministic YouTube proof already exists.
- Mind-generated variants never enter the P4 posting route; creator approval and final confirmation remain required.

### Minds

- The Builder API key is accepted by the live API. The key itself is not recorded here.
- `minds:discover` passed.
- The configured Memora Mind was found:
  - Mind ID: `55ce4f3e-f36b-1410-8466-00039ce7df11`
  - Enabled: `true`
- `minds:ping` passed. The Mind returned `PONG` during explicit history polling.
- `minds:spike` passed with a unique fixture run:
  - Run ID: `memora-spike-1787668157736`
  - Conversation ID: `1abb503e-f36b-1410-8466-00039ce7df11`
  - Total messages: `17`
  - Both events recorded: `true`
  - Same conversation: `true`
  - Continuity verdict: `verified`
  - Viewer referenced: `true`
  - Context found: `editing`, `software`, `beginners`, `beginner`, `workflow`
  - Follow-up reason found: `true`

The second event response identified Alex, recalled the earlier editing-software question, explained why the new video answered it, and recommended replying with the video link. Each spike run includes a unique run ID in its event IDs, source IDs, and message payloads so fresh runs are not rejected as duplicate fixtures.

## Commands Passed

The following live diagnostics and project checks passed:

```text
npm run youtube:doctor
npm run db:doctor
npm run discord:doctor
npm run minds:discover
npm run minds:ping
npm run minds:spike
supabase db push
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` passed with 59 tests. The diagnostics print safe state and identifiers only; never copy private environment values into a proof document or screenshot.

## Judge Demo Proof Path

1. Open `/app/import`.
2. Confirm the YouTube connection and fetch recent videos.
3. Select a real video and import its comments.
4. Open `/app/import/discord` and run the read-only Discord import.
5. Open `/app/memory` and show the resulting source-backed YouTube and Discord audience records and original text.
6. Open `/app/follow-up` and show the `REAL DISCORD DATA` opportunity as `needs_review` and `draft_only`.
7. Click `ASK MEMORA MIND` on an opportunity and show the source-grounded reasoning, tone, and optional variants.
8. Refresh `/app/follow-up` and confirm the reasoning remains attached to the same opportunity.
9. Review the suggested YouTube draft and click `APPROVE FOLLOW-UP`.
10. Use the final confirmation panel and click `CONFIRM AND POST REPLY` only for an explicitly approved test comment.
11. Return to `/app/follow-up` and `/app/proof` to show the saved reply ID and posted timestamp.
12. Run `npm run minds:spike` and show `EVENT 1`, `EVENT 2`, `HISTORY PROOF`, and `CONTINUITY VERDICT` with `status: verified`.
13. Open `/app/proof` if available. The Minds-specific proof surface is `/app/proof/minds-spike` in development.

## Screenshot Evidence Checklist

Capture only the minimum evidence needed for the demo:

- `/app/import` showing the connected channel state and recent video list.
- `/app/import/discord` showing configured read-only Discord channels and the import result.
- `/app/import/discord` showing the user-connected guild, bot-readable channel picker, saved selection, and import receipt.
- `/app/settings` showing the active creator voice and the safety boundary copy.
- The selected-video import result showing imported comment counts or success summary.
- `/app/memory` showing source-backed audience records, source labels, and original text.
- `/app/follow-up` showing the approved draft and final confirmation before any public post.
- `/app/follow-up` showing `Generated by Memora Mind from source-backed facts.` and the persisted reasoning after refresh.
- `/app/proof` showing the posted count and saved YouTube reply proof, only after a deliberate live test.
- A safe `npm run youtube:doctor` output showing refreshable token state, API connectivity, and recent-video query success.
- A safe `npm run discord:doctor` output showing configured guild/channel access and readable recent messages.
- A safe `npm run db:doctor` output showing all tables healthy, including `youtube_connections`.
- `npm run minds:discover` showing Memora and its enabled state.
- `npm run minds:ping` showing `mindReply: PONG` and `timedOut: false`.
- `npm run minds:spike` showing the run ID, both event replies, same-conversation history proof, and the verified continuity verdict.
- `/app/proof/minds-spike` showing the Mind connection, both replies, history evidence, and continuity verdict if the development route is available.

Do not include browser address-bar secrets, `.env.local`, OAuth callback parameters, cookies, authorization headers, API keys, refresh tokens, or full private environment values in screenshots.

## Do Not Regress

- [ ] Do not change OAuth scopes without retesting comments import.
- [ ] Do not add Discord permissions beyond View Channels and Read Message History without an explicit security review.
- [ ] Do not reset Supabase seed data without preserving the existing demo evidence.
- [ ] Do not clear Minds conversation history before recording proof.
- [ ] Do not remove unique run IDs from `minds:spike`.
- [ ] Do not expose API keys, refresh tokens, client secrets, encryption keys, or private environment values in logs or documentation.
- [ ] Do not replace real YouTube/Minds calls with local mock responses for milestone evidence.
- [ ] Do not post a reply without a persisted creator approval for the exact draft text.
- [ ] Do not retry a request after YouTube succeeds but proof storage fails until the queue is checked.
- [ ] Do not treat Mind reasoning or variants as creator approval or as a posting instruction.

## Evidence Boundary

This milestone proves read-only Discord guild/channel access, bounded Discord message import with idempotent Supabase persistence, the P7 connection schema and protected OAuth foundation, real YouTube OAuth, token handling, bounded video/comment import, creator-approved reply posting and proof, live source-grounded Mind reasoning with persistence, explicit history polling, and continuity evaluation. It does not yet prove external Discord OAuth completion, real user connection/channel persistence, production authentication, background synchronization, Discord posting/moderation, arbitrary Minds memory CRUD, or production deployment readiness.
