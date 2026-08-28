# Memora

## A persistent audience-memory agent for creators

**Memora is a persistent audience-memory agent for creators. It remembers important fan questions across YouTube and Discord, helps creators follow up with the right content or reply, and keeps proof of every step.**

**Creative Minds Jam:** Audience Growth & Engagement

Creators do not only need comment management. They need relationship memory.

A fan may ask, "Can you make this simpler?" or "Where should I start?" That request can disappear inside a YouTube comment thread, a busy Discord channel, or a fast-moving community. Memora keeps the request attached to the person, the source, the creator workspace, and the future moment when a useful response becomes possible.

Memora turns forgotten audience questions into remembered relationships and source-backed follow-ups.

### Start here

| Surface | What to see |
| --- | --- |
| `/app/demo` | Public demo workspace. No sign-in required. |
| `/app/my` | Authenticated private creator workspace. |
| `/app/my/memory` | Source-backed audience history. |
| `/app/my/follow-up` | Follow-up opportunities and Memora Mind advisory. |
| `/app/my/proof` | Evidence, approvals, receipts, and action history. |
| `npm run discord:listen` | Long-running Discord Gateway worker. |

## Contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [Why this matters for creators](#why-this-matters-for-creators)
- [How Memora uses Minds](#how-memora-uses-minds)
- [Product walkthrough](#product-walkthrough)
- [Current feature list](#current-feature-list)
- [Architecture](#architecture)
- [Safety model](#safety-model)
- [Routes](#routes)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Discord worker deployment](#discord-worker-deployment)
- [Demo script for judges](#demo-script-for-judges)
- [Current status](#current-status)
- [Roadmap](#roadmap)

## The Problem

Creators are overwhelmed by comments, replies, direct messages, repeated questions, and community requests. The important problem is not only volume. It is lost continuity.

A fan asks for a beginner guide today. A creator publishes a relevant video two weeks later. The creator may never remember who asked, where they asked, or exactly what they needed. The fan never gets reconnected to the content they helped inspire.

That gap appears everywhere:

- A YouTube comment asks for a simpler walkthrough.
- A Discord member asks what to read first.
- A community member asks whether there is a resource for beginners.
- A creator eventually publishes the answer, but the original request is buried.
- The audience experiences every interaction as isolated, even when the creator has already made progress toward an answer.

Existing tools help creators schedule, publish, moderate, analyze, and respond. Those tools are useful, but they generally treat audience messages as items in an inbox or metrics in a dashboard.

Memora starts from a different premise: an audience question is not disposable feedback. It is the beginning of a relationship that may need to be remembered until the right follow-up moment arrives.

## The Solution

Memora is a creator-side memory layer for audience relationships. A creator connects YouTube and Discord, imports source-backed interactions, and lets Memora preserve the context that normally gets lost.

The product connects five stages into one inspectable loop:

```text
Observe -> Remember -> Notice -> Reconnect -> Prove
```

### Observe

Memora imports source-backed audience interactions from creator-authorized YouTube and selected Discord channels. The original comment or message remains tied to its source, platform identity, channel, timestamp, and creator workspace.

### Remember

Memora stores each audience member, question, interaction, and source context in the correct workspace. It can remember that a particular community member asked for a beginner walkthrough, what channel they asked in, and what the creator had published at the time.

The memory layer is factual first. It does not pretend to know a person's motivations when the source does not support that conclusion.

### Notice

When a creator imports new content or a relevant creator event is recorded, Memora looks for a meaningful connection to an older audience question. It surfaces a follow-up opportunity with the source question, the remembered context, the new event, and an explanation of why the connection matters now.

### Reconnect

The creator can ask the persistent Memora Mind for advisory reasoning. The Mind helps explain what the fan likely needs, whether the creator should reply now, whether a new piece of content should be created first, and what tone would preserve continuity.

The creator chooses the action. YouTube replies require explicit approval. Discord onboarding replies are limited to configured rules, channels, and clear triggers.

### Prove

Memora preserves receipts for imports, advisory reasoning, selected reply variants, approvals, content tasks, Discord onboarding assists, and YouTube reply actions. The Proof page makes the chain visible:

```text
source -> audience memory -> opportunity -> Mind advice -> creator decision -> action receipt
```

Memora is not only suggesting what might have happened. It shows the evidence behind what happened.

## Why This Matters for Creators

Memora helps creators build continuity instead of treating every message as a one-off task.

- **Better audience relationships:** A creator can reconnect with the person behind a request instead of replying as if the conversation started today.
- **Better follow-up content:** Repeated beginner questions become concrete signals for guides, walkthroughs, and explanations.
- **More trust with fans:** People are more likely to feel seen when a creator follows through on a request they made earlier.
- **Less forgotten context:** Source messages, audience members, and relevant creator events stay connected over time.
- **More useful community onboarding:** New members can receive a configured path to the right channels and resources without an uncontrolled bot answering everything.
- **Better content planning:** Creators can plan from real audience needs rather than relying only on aggregate engagement metrics.
- **Safer AI assistance:** The Mind advises, while the creator controls public YouTube replies and the rules that govern Discord assistance.

The product thesis is simple:

> The next generation of creator tools should remember relationships, not just reactions.

## How Memora Uses Minds

Minds is integral to Memora because the product is not merely storing comments. Supabase stores the source-backed facts, while the Memora Mind is the persistent reasoning and advisory layer that helps the creator reason about continuity across time.

Memora uses Minds as the persistent reasoning layer, not as a generic text generator attached to a comment box.

### Facts and reasoning have different jobs

Supabase stores deterministic facts that Memora must be able to verify:

- Who asked.
- What they asked.
- Where they asked.
- Which creator workspace owns the data.
- Which video, channel, or Discord message the interaction came from.
- Which creator event might answer the request.
- Which action the creator took.

The Memora Mind helps interpret the relationship context around those facts:

- What the fan likely needs.
- Whether the creator should reply now.
- Whether a follow-up video should be created first.
- What tone would work best.
- How to explain the answer clearly.
- How to preserve continuity without inventing facts.

This separation matters. The database provides the grounded timeline. Minds provides an advisory interpretation of that timeline.

### The Mind's role in the product loop

When a creator opens a follow-up opportunity, Memora gives the Mind a server-resolved context containing the relevant source question, creator event, workspace facts, creator voice, and previously saved relationship history. The Mind returns structured advisory sections rather than an opaque paragraph.

The advisory can include:

- Fan question.
- Source video context.
- Likely need.
- Recommended action.
- Reply-now draft.
- Follow-up outline.
- Attached video status.
- Suggested tone.
- Optional reply variants.

The Mind does not get to rewrite source facts, invent a video, or claim that an action was posted when no receipt proves it.

### Creator control remains explicit

- Minds is advisory.
- The creator remains in control of public action.
- Memora does not let the Mind post YouTube replies automatically.
- YouTube posting is gated by creator approval of the selected text.
- Discord onboarding is rule-bounded and channel-limited.
- A missing follow-up video becomes a content task instead of an invented link.

### Persistent workspace-specific identity

Memora uses workspace-specific Mind aliases so the reasoning layer can preserve the right creator context without mixing the public demo and private workspaces:

- Public demo alias: `memora-demo-main`
- Personal workspace alias: `memora-workspace-<workspace_id>`

The demo and a creator's private workspace are separate data and reasoning contexts.

## Product Walkthrough

### Public demo

Open `/app/demo` to explore the public demo workspace without signing in. The demo provides a safe, source-backed view of the memory loop, follow-up opportunities, proof receipts, and the role of the Memora Mind.

The demo is intentionally separate from personal creator data. It is a deterministic workspace designed for judges and first-time visitors to understand the product quickly.

### Private creator workspace

Open `/app/my` after signing in. Email/password authentication is handled through Supabase Auth. Each creator receives an isolated workspace, and the dashboard only loads that creator's connected sources and imported data.

The same product loop works in the private workspace, but its data, integrations, Mind alias, and receipts belong only to that creator's workspace.

### YouTube import

1. The creator connects their own YouTube channel through Google OAuth.
2. Memora fetches recent videos from the connected channel.
3. The creator selects a source video.
4. Memora imports a bounded set of public YouTube comments.
5. The app stores channel identity, video metadata, comments, source records, audience members, and creator events.
6. The original comment remains available as the source-backed beginning of any later opportunity.

YouTube connections are unique per workspace and channel. The reconnect flow updates the existing workspace connection instead of creating a second unrelated identity.

### How Memora can reply to YouTube comments

Memora treats a YouTube reply as a deliberate creator action, not an automatic side effect of importing a comment or generating text. The full flow is:

1. The creator connects their YouTube channel through Google OAuth.
2. The creator selects a video and Memora imports its bounded set of public comments.
3. Memora detects a follow-up opportunity by connecting an audience question to relevant creator content or a later creator event.
4. The creator opens the opportunity and asks the Memora Mind for guidance.
5. The Mind advises on what the fan likely needs, whether to reply now or create follow-up content first, and what tone fits the relationship.
6. Memora presents reply variants such as **Warm**, **Short**, and **Beginner-friendly**.
7. The creator chooses the reply tone and selected text.
8. The creator explicitly approves the selected reply.
9. Only after approval can Memora post the reply to the original YouTube comment, and only if YouTube posting is enabled for that workspace and action.
10. If posting succeeds, Memora stores the external reply ID and action receipt as proof.

Memora does **not** auto-post YouTube replies by default. The Memora Mind cannot publish on its own, and generated text is never treated as evidence that a public reply was sent. If the right response is a new guide rather than a comment, Memora creates a needs-follow-up-content task instead of forcing an unhelpful reply or inventing a link.

### Audience memory

Open `/app/my/memory` to see factual audience history. Memora shows:

- Audience members.
- Interaction count.
- Open questions.
- Last seen date.
- Source records.
- Factual timelines.

The page intentionally avoids fake AI-generated profiles. It shows what the source data supports first. The Memora Mind's interpretation appears later, where the creator can inspect it alongside the underlying evidence.

### Follow-up reasoning

Open `/app/my/follow-up` to see follow-up opportunities. Each opportunity can show:

- The original source comment.
- Remembered audience context.
- The new creator content or event.
- Why the connection matters now.
- A suggested follow-up.
- A proof thread.
- The Memora Mind advisory panel.
- Reply variants.
- Creator approval controls.

The creator can click **Ask Memora Mind** or refresh the reasoning. The Mind helps turn a raw opportunity into a decision without replacing the source-backed timeline.

### Reply selection and approval

Memora can provide selectable reply variants:

- **Warm:** More personal and relationship-oriented.
- **Short:** Direct and efficient.
- **Beginner-friendly:** Clearer context for someone at the start of their journey.

The creator can select a preferred tone, copy the selected reply, and approve it. YouTube posting remains gated by that explicit creator approval. Memora never treats generated text as proof that a public reply was posted.

### Follow-up content tasks

Sometimes the correct response is not a comment. It is a new guide or walkthrough that does not exist yet.

If there is no valid later follow-up video, Memora does not invent a link or attach the original source video as a false answer. It marks the opportunity as **needs follow-up content** and saves a content-task receipt.

That receipt keeps the missing task attached to the original fan question. After the creator publishes the beginner guide or walkthrough, they can import the new video, and Memora can reconnect the new creator event to the original request.

### Proof

Open `/app/my/proof` to show the evidence trail. The page can include:

- YouTube imports.
- Audience memory.
- Follow-up opportunities.
- Memora Mind reasoning.
- Creator approvals.
- Follow-up content tasks.
- Discord onboarding receipts.
- Posted reply status when a verified action exists.

The Proof page is the clearest demonstration that Memora is more than a suggestion generator. It preserves the source, reasoning, decision, and outcome of the follow-up loop.

### Discord onboarding

1. The creator connects a Discord server through Discord OAuth and bot installation.
2. Memora discovers readable channels.
3. The creator selects the channels Memora may read.
4. The creator configures welcome, resource, question, support, and builder/community destinations.
5. The creator defines the beginner guide text and safe onboarding mode.
6. Memora imports selected text-channel messages as read-only community memory.
7. The live worker listens for clear onboarding and start/resource requests.
8. A valid request receives the configured onboarding response in the source channel.
9. Every assist attempt is stored as a receipt.

The verified live example is intentionally simple: a user posted, **"I'm new here, where should I start?"** The Memora Demo Bot replied with the configured onboarding response pointing the member to the appropriate channels.

## Current Feature List

The following capabilities are present in the current build:

- [x] Public demo workspace at `/app/demo`.
- [x] Authenticated creator workspace at `/app/my`.
- [x] Workspace isolation for demo and private creator data.
- [x] Supabase email/password authentication.
- [x] Supabase Postgres source-backed memory store.
- [x] YouTube OAuth through Google.
- [x] YouTube video fetching from the connected channel.
- [x] Bounded public YouTube comment import.
- [x] Source-backed audience memory.
- [x] Follow-up opportunity matching.
- [x] Memora Mind advisory reasoning.
- [x] Warm, Short, and Beginner-friendly reply variants.
- [x] Creator reply selection and copy flow.
- [x] Explicit creator approval flow.
- [x] YouTube posting gated by creator approval.
- [x] Needs-follow-up-content workflow.
- [x] Follow-up content-task receipts.
- [x] Proof page with source evidence and action receipts.
- [x] Discord OAuth.
- [x] Discord bot installation.
- [x] Discord readable-channel discovery and selection.
- [x] Read-only Discord message import.
- [x] Discord community memory.
- [x] Discord onboarding settings.
- [x] Configured welcome, resource, question, support, and builder/community destinations.
- [x] Live Discord Gateway worker on Railway.
- [x] Verified live Discord bot reply.
- [x] Workspace-specific Memora Mind aliasing.
- [x] Safe link handling based on verified matching creator-event video IDs.
- [x] Demo/private data separation.
- [x] Duplicate protection for Discord message processing.
- [x] Honest sent, drafted, failed, skipped, and content-task receipts.
- [x] TypeScript type safety.
- [x] Passing automated test suite.

## Architecture

Memora keeps the user-facing application and the long-running Discord Gateway process separate. The web app runs on Vercel. The Discord listener runs as a worker because a Gateway connection must remain alive.

```text
                         +----------------------+
                         |  YouTube / Discord   |
                         +----------+-----------+
                                    |
                                    v
                    +-------------------------------+
                    | Ingestion and live listeners  |
                    | OAuth, imports, Gateway       |
                    +---------------+---------------+
                                    |
                                    v
                    +-------------------------------+
                    | Supabase Auth + Postgres      |
                    | Workspaces, sources, memory,  |
                    | events, actions, receipts     |
                    +---------------+---------------+
                                    |
                                    v
                    +-------------------------------+
                    | Persistent Memora Mind        |
                    | Minds Builder API advisory    |
                    +---------------+---------------+
                                    |
                                    v
                    +-------------------------------+
                    | Opportunity and onboarding    |
                    | reasoning, variants, rules    |
                    +---------------+---------------+
                                    |
                                    v
                    +-------------------------------+
                    | Creator approval or narrow    |
                    | configured Discord assistance |
                    +---------------+---------------+
                                    |
                                    v
                    +-------------------------------+
                    | Proof receipts and timelines  |
                    +-------------------------------+
```

### Frontend

- Next.js application deployed on Vercel.
- Landing page and workspace chooser.
- Public demo and authenticated private workspace.
- Import, memory, follow-up, proof, settings, and Discord onboarding surfaces.
- Workspace-aware routing for `/app/demo/...` and `/app/my/...`.

The visible workspace paths are resolved through middleware to shared Next.js page implementations. That allows the product to keep one interface while ensuring the selected demo or private workspace controls the data context.

### Database and authentication

- Supabase Auth provides email/password sign-in.
- Supabase Postgres stores deterministic source-backed memory.
- Workspace-scoped records include sources, creator events, audience members, interactions, integrations, actions, onboarding settings, and proof receipts.
- Data loaders, imports, integrations, replies, onboarding flows, and listener storage carry the active `workspace_id`.
- The public demo workspace is separated from personal creator workspaces.

Supabase is the factual memory and authorization boundary. It is not replaced by an LLM prompt.

### YouTube

- Google OAuth connects the creator's own channel.
- YouTube Data API fetches recent videos.
- Public comments are imported with bounded limits.
- Videos and comments become source records, audience interactions, and creator-event metadata.
- Workspace and channel uniqueness prevent accidental cross-workspace reuse.
- Public posting is a separate, creator-approved action.

### Discord

- Discord OAuth handles the bot installation flow.
- The creator selects readable text channels.
- Discord import is read-only.
- Selected messages become community source facts and audience memory.
- A long-running Discord Gateway listener runs from `scripts/discord/listener.ts`.
- The listener loads every saved workspace connection from Supabase rather than using one hardcoded demo guild.
- Incoming messages are routed by `guild_id`, then checked against the matching workspace's selected channels and onboarding settings.
- Rule-bound onboarding replies use the configured source channel and destination rules.

### Minds

- Minds Builder API provides the persistent advisory layer.
- Workspace-specific aliases keep demo and private creator reasoning separate.
- Memora sends server-resolved facts and relationship context to the Mind.
- The Mind returns advisory reasoning and reply/content planning.
- Source facts, approvals, and external actions remain stored and verifiable in Supabase.

Memora is not hosted entirely on Minds. Minds provides the reasoning layer inside a broader product architecture that combines integrations, deterministic memory, creator controls, and proof.

## Safety Model

Memora is intentionally not an uncontrolled posting agent. Its core product claim depends on trustworthy continuity, so the system separates facts, reasoning, authorization, and external action.

### Safety decisions

- **Facts before reasoning:** Source records and workspace ownership are resolved before advisory reasoning is requested.
- **Source-backed memory only:** Memora does not invent audience history or pretend to know private context it was not given.
- **No arbitrary YouTube auto-posting:** YouTube replies require explicit creator approval of the selected text.
- **Narrow Discord assistance:** Discord replies are limited to configured onboarding/start/resource cases.
- **Bot protection:** Bot and self-authored messages are ignored where appropriate.
- **Duplicate protection:** The same Discord source message cannot create a second onboarding reply.
- **Channel boundaries:** The listener respects saved channel selections and verifies its permissions before processing a workspace.
- **Workspace boundaries:** Demo and private data remain separate, and listener reads and writes carry the matched `workspace_id`.
- **Verified links only:** YouTube links are generated only from verified matching creator-event video IDs in the active workspace.
- **No fabricated follow-up links:** If a valid later video does not exist, Memora creates a link-free reply or a content task.
- **Server-only credentials:** Supabase service-role keys, OAuth secrets, bot tokens, encryption keys, and Minds credentials never belong in browser code.
- **Honest receipts:** Sent, drafted, failed, skipped, and needs-follow-up-content states are recorded distinctly.

### What the Mind cannot claim

The Mind cannot turn an unverified source into a verified fact, attach a stale or unrelated video, or claim that a reply was posted without an external action receipt. The creator sees the underlying source and keeps the final say over public YouTube communication.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page and product introduction. |
| `/app` | Workspace chooser and entry route. |
| `/app/demo` | Public demo workspace. |
| `/app/my` | Authenticated private creator workspace. |
| `/app/my/import` | Workspace-aware import surface for YouTube and Discord. |
| `/app/my/memory` | Workspace-aware source-backed audience memory. |
| `/app/my/follow-up` | Workspace-aware follow-up opportunities and Memora Mind advisory. |
| `/app/my/proof` | Workspace-aware proof receipts and evidence trail. |
| `/app/import/discord` | Shared Discord import and onboarding implementation route; it is also reachable through the workspace-prefixed path. |
| `/api/youtube/connect` | Starts YouTube OAuth. |
| `/api/youtube/callback` | Completes YouTube OAuth. |
| `/api/youtube/import-comments` | Imports bounded public comments. |
| `/api/youtube/post-reply` | Posts an explicitly approved YouTube reply. |
| `/api/discord/connect` | Starts Discord OAuth and bot installation. |
| `/api/discord/callback` | Completes Discord OAuth. |
| `/api/discord/import` | Imports selected Discord messages. |
| `/api/discord/onboarding/settings` | Reads and saves onboarding configuration. |
| `/api/discord/onboarding/run` | Runs a configured onboarding assist. |
| `/api/minds/reason-follow-up` | Requests advisory follow-up reasoning. |

## Environment Variables

Use placeholders only. Never commit `.env.local`, service-role keys, OAuth secrets, bot tokens, encryption keys, or Minds credentials.

```dotenv
NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MEMORA_DEV_DB_ACCESS=service_role
MEMORA_DEMO_WORKSPACE_ACCESS=disabled

MINDS_BUILDER_API_KEY=
MEMORA_MIND_ID=
MEMORA_MIND_ALIAS=memora-main

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/youtube/callback

TOKEN_ENCRYPTION_KEY=
YOUTUBE_TOKEN_ENCRYPTION_KEY=

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
DISCORD_REDIRECT_URI=http://localhost:3000/api/discord/callback
DISCORD_GUILD_ID=
DISCORD_MONITORED_CHANNEL_IDS=
```

### Variable guidance

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` support the browser and authenticated web flows.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. The live Discord worker uses it to load and persist workspace-scoped data.
- `MEMORA_DEV_DB_ACCESS=service_role` is a local development data-access gate. It is not required by the production Discord worker.
- `MEMORA_DEMO_WORKSPACE_ACCESS=enabled` exposes the seeded public demo workspace on a deployment. This is separate from creator authentication.
- `MINDS_BUILDER_API_KEY` and `MEMORA_MIND_ID` configure the Minds Builder API integration.
- `MEMORA_MIND_ALIAS` is the default alias; runtime workspace aliases keep demo and personal reasoning separate.
- `GOOGLE_*` variables configure YouTube OAuth.
- `YOUTUBE_TOKEN_ENCRYPTION_KEY` is the current application-specific name for encrypted YouTube token storage. `TOKEN_ENCRYPTION_KEY` is retained as a deployment-template placeholder for environments that standardize on a generic name.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_PUBLIC_KEY`, and `DISCORD_REDIRECT_URI` configure the web OAuth/install flow.
- `DISCORD_BOT_TOKEN` authenticates the Gateway worker.
- `DISCORD_GUILD_ID` and `DISCORD_MONITORED_CHANNEL_IDS` are legacy or local single-guild configuration placeholders. The production multi-workspace worker loads saved guild and channel configuration from Supabase.

### Production worker variables

The long-running Discord worker requires these runtime values:

```text
DISCORD_BOT_TOKEN
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
MINDS_BUILDER_API_KEY
MEMORA_MIND_ID
```

The worker does not need the Discord OAuth client ID, client secret, or redirect URI to receive Gateway events. Those variables belong to the Vercel web app's connection flow.

## Local Development

### Requirements

- Node.js 22 or newer.
- A Supabase project.
- A Minds Builder API key and configured Mind.
- YouTube OAuth credentials for the YouTube flow.
- Discord OAuth and bot credentials for the Discord flow.

### Install

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in the values needed for the flow you want to test. Keep all server credentials out of browser code and source control.

Apply the existing Supabase migrations and seed the safe demo workspace through the project's database workflow:

```bash
npx supabase db push
npm run db:seed
npm run db:doctor
```

Register these local OAuth callbacks:

```text
YouTube: http://localhost:3000/api/youtube/callback
Discord: http://localhost:3000/api/discord/callback
```

### Run the web app

```bash
npm run dev
```

Then open `http://localhost:3000`. Use `/app/demo` for the public demo or `/app/my` for the authenticated creator workspace.

### Quality checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

### Useful diagnostics

```bash
npm run db:doctor
npm run youtube:doctor
npm run discord:doctor
npm run discord:inspect-onboarding
npm run minds:discover
npm run minds:ping
npm run minds:spike
```

## Discord Worker Deployment

The web app runs on Vercel, but the Discord Gateway listener must run as a long-lived process. Do not deploy the listener as a Vercel serverless function. A Gateway connection needs a persistent worker process.

### Development

Run the listener separately from the Next.js app:

```bash
npm run discord:listen
```

The listener loads saved Discord connections and onboarding settings from Supabase. It is no longer tied to one hardcoded demo creator or guild.

### Production

Deploy the listener as one of the following:

- Railway Worker.
- Render Background Worker.
- Another long-running worker host with restart behavior.

Use this start command:

```bash
npm run discord:listen
```

Configure the production worker with `DISCORD_BOT_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MINDS_BUILDER_API_KEY`, and `MEMORA_MIND_ID`. Keep the bot token and service-role key in the platform secret manager.

### What the worker does

- Loads every workspace-scoped Discord connection from Supabase.
- Loads each connection's saved channels and onboarding settings.
- Verifies the saved guild and selected-channel permissions.
- Listens to Discord Gateway events with the Message Content Intent.
- Routes messages by `guild_id` to the matching workspace.
- Ignores bot messages, empty messages, unknown guilds, and ambiguous duplicate guild mappings.
- Checks the workspace's selected channels and onboarding settings.
- Matches only narrow, clear onboarding/start/resource triggers.
- Persists selected source facts as read-only memory.
- Sends only allowed configured onboarding responses.
- Records sent, failed, skipped, and duplicate outcomes as workspace-scoped receipts.
- Refreshes saved workspace configuration periodically without requiring a redeploy.

### Discord setup requirements

1. Enable **Message Content Intent** in the Discord Developer Portal.
2. Invite the bot to each guild connected by a creator.
3. Grant `View Channel`, `Read Message History`, and `Send Messages` in each selected channel.
4. Configure onboarding settings in Memora before testing an auto-reply.
5. Run one worker instance per bot token unless Discord sharding is intentionally configured.

### Expected logs

Startup logs are designed to make deployment diagnosis straightforward without printing secrets:

```text
[discord listener] Discord listener booting
[discord listener] Supabase connected
[discord listener] Loaded connected guild count=...
[discord listener] Discord client ready
[discord listener] Listening for workspace-scoped onboarding messages
```

Per-message logs contain IDs, booleans, classifications, outcomes, and safe error categories. They do not print Discord, Supabase, or Minds credentials.

The repository also contains the detailed deployment guide at [`docs/deploy-discord-worker.md`](docs/deploy-discord-worker.md).

## Demo Script for Judges

This is a polished 90-120 second walkthrough for the Creative Minds Jam submission.

### 1. Open with the thesis

> "Memora helps creators remember audience relationships, not just comments. A fan can ask for a beginner guide today, the creator can publish it weeks later, and the relationship still has a path back to that person."

### 2. Show the public demo

Open `/app/demo`.

> "This is the public demo workspace. Judges can explore the product without signing in. The data is separated from private creator workspaces, so the demo is safe to inspect and the memory loop is immediately visible."

Point to the audience memory and follow-up surfaces.

### 3. Show the private workspace

Open `/app/my` or the workspace chooser.

> "A real creator signs in through Supabase Auth and gets an isolated workspace. Their connected sources, audience memory, integrations, and Mind context belong to them, not to the demo."

### 4. Import YouTube source data

Open the import flow, connect YouTube, select a video, and import public comments.

> "Memora starts with source-backed facts. It records who asked, what they asked, which video they asked on, and the audience history around that interaction."

### 5. Show audience memory

Open `/app/my/memory`.

> "This page deliberately shows factual history first. It does not fabricate a personality profile. The creator can see the audience member, interaction count, open question, source, and timeline before any AI interpretation appears."

### 6. Open a follow-up opportunity

Open `/app/my/follow-up`.

> "When a relevant creator event appears, Memora connects it to an older audience question and explains why this is a follow-up opportunity now."

### 7. Ask the Memora Mind

Click **Ask Memora Mind** or refresh reasoning.

> "The persistent Memora Mind is the reasoning layer. It interprets the relationship context, suggests what the fan likely needs, recommends whether to reply or create content first, and proposes a tone. Supabase still owns the underlying facts."

### 8. Choose a reply strategy

Select **Warm**, **Short**, or **Beginner-friendly**.

> "The creator remains in control. They choose the variant, copy it, and approve it. Memora does not auto-post a YouTube reply just because the Mind generated one."

### 9. Show the missing-content path

If no valid later video exists, mark the opportunity as **needs follow-up content**.

> "If the right guide does not exist yet, Memora does not invent a link. It saves a content-task receipt attached to the original fan question. When the creator publishes and imports the new video, the loop can reconnect."

### 10. Show Proof

Open `/app/my/proof`.

> "Proof shows the source evidence, audience memory, Mind reasoning, selected tone, approval, content task, and any external action receipt. This makes the full loop inspectable instead of asking the judge to trust a generated claim."

### 11. Show Discord live behavior

Open the Discord onboarding surface, then show the verified worker behavior in the configured server.

> "The same memory thesis extends to community onboarding. The creator selects readable channels and configures safe destinations. The Railway worker listens to the live Gateway, matches only clear onboarding requests, and replies in the allowed channel."

Show the verified example: a user asked, **"I'm new here, where should I start?"** and the Memora Demo Bot replied with the configured onboarding path.

### 12. Close on the thesis

> "Memora turns forgotten audience questions into remembered relationships and source-backed follow-ups. It combines deterministic memory, a persistent Minds advisor, creator control, and proof of every meaningful step."

## Current Status

Memora is a working end-to-end Creative Minds Jam submission with public demo and private-workspace flows.

- Public demo works at `/app/demo`.
- Supabase email/password authentication works.
- Private creator workspace works at `/app/my`.
- Workspace isolation is implemented across data loaders, imports, integrations, replies, onboarding, and listener storage.
- YouTube OAuth works.
- YouTube video fetching works.
- YouTube public comment import works.
- Source-backed audience memory works.
- Follow-up opportunity matching works.
- Memora Mind advisory reasoning works.
- Reply variant selection works.
- Creator approval flow works.
- Needs-follow-up-content and content-task receipts work.
- Proof page works.
- Discord OAuth and bot installation work.
- Discord channel selection and read-only import work.
- Discord onboarding settings work.
- The Railway Discord worker is live.
- A live Discord bot reply has been verified.
- Per-workspace Mind aliasing is implemented.
- Safe link handling and demo/private data separation are implemented.
- Automated tests, typecheck, lint, and production build pass.

### Verification commands

```text
npm test          # 123 passed
npm run typecheck # passed
npm run lint      # passed
npm run build     # passed
```

The production build currently emits the existing Next.js warning that the `middleware` file convention is deprecated in favor of `proxy`. This does not prevent the build from completing successfully.

## Roadmap

Memora's post-hackathon roadmap is about extending relationship memory without weakening source grounding or creator control.

- Multi-platform support for TikTok, Instagram, X, and Twitch.
- Stronger creator content-calendar integrations.
- Better automatic detection of unanswered and repeated audience requests.
- More robust matching when a follow-up video is published after the original request.
- Team and shared creator workspaces with explicit roles.
- Richer long-term Memora Mind context for audience relationships.
- Creator analytics around repeated audience needs and content gaps.
- Safer publishing workflows with review queues and action previews.
- Hosted worker provisioning per creator or Discord server.
- Health checks, observability, and replay tools for worker operations.

## The Thesis

Memora is not another dashboard, generic chatbot, comment importer, or Discord bot.

It is a persistent audience-memory agent for creators. It remembers who asked, what they needed, where the request came from, when the right follow-up moment arrives, and what the creator chose to do.

The product combines:

```text
source-backed memory
+ persistent Minds reasoning
+ creator-controlled action
+ inspectable proof
```

That combination is what makes Memora a strong Creative Minds Jam submission. It applies an agent to a real creator-economy problem, gives the agent durable relationship context, connects that context to live platforms, and makes the resulting loop accountable to the creator and visible to the audience.
