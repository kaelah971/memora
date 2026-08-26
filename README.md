# Memora

## A persistent audience memory agent for creators and communities.

Memora helps creators and community teams remember the people behind their audience. It observes selected YouTube and Discord surfaces, remembers source-backed questions and context, notices useful follow-up moments, and helps reconnect safely through creator-approved replies, onboarding assistance, and transparent proof receipts.

**Hackathon track:** Audience Growth & Community Engagement

## The Problem

Creators do not lose audiences only because they fail to post. They lose audiences because context gets buried.

Someone asks for a beginner guide. Someone asks for a simpler walkthrough. Someone says they do not understand how to start. Days later, the creator publishes exactly the content that answers them, but nobody remembers to reconnect.

That context is scattered across YouTube comments, Discord channels, creator announcements, support questions, and community discussions. Moderators cannot watch every channel. Creators cannot remember every person who asked for a guide, explanation, or follow-up. The result is missed engagement, repeated questions, weaker onboarding, and lost community trust.

## What Memora Does

Memora gives creators, communities, and projects a durable memory layer for audience relationships.

It does not just collect comments. Memora remembers what people asked, why it matters, what source-backed content or resource could help, and whether the creator or community has already responded.

Most creator tools help publish content. **Memora helps creators remember people.** It turns audience interactions into persistent relationships and proof-backed next steps.

## Who It Helps

### Creators

Memora keeps useful YouTube questions attached to the people and source messages behind them. When relevant new content appears, the creator gets a follow-up opportunity instead of having to scroll through old comments.

### Community moderators

Memora remembers recurring questions and community context across selected Discord channels. Moderators no longer need to be online in every channel to catch clear beginner and onboarding requests.

### Projects and community teams

Memora creates a shared, source-backed history of audience needs. Teams can understand where confusion repeats, what resources people need, and which actions have already happened.

## Product Flows

### YouTube memory and follow-up

1. A viewer asks for a simpler walkthrough, beginner explanation, or follow-up video.
2. Memora imports the comment from a creator-authorized video and stores the original source message.
3. The audience member and their relationship history become part of source-backed memory.
4. When relevant new content or a creator event exists, Memora surfaces a follow-up opportunity with its reason.
5. The creator can approve, dismiss, or post a reply. YouTube replies require explicit creator approval.
6. The posted reply and external message ID are saved as proof.

### Discord community memory and onboarding

1. A new or confused community member asks where to start, requests a guide, or asks for beginner resources.
2. Memora reads only selected, public, creator-authorized channels and persists the source message.
3. A persistent Minds agent uses saved community rules, source-backed channel context, and prior relationship memory.
4. For a narrow set of clear onboarding and start/resource requests, Memora can send the correct beginner path in the same channel where the member asked.
5. Unselected guide requests can be retained without triggering an automatic reply.
6. The onboarding receipt records the trigger reason, generated text, destination channel, sent message ID, and Mind conversation ID.

### Proof and safety

Every meaningful action is inspectable. Memora shows where the memory came from, what it generated, what was approved or sent, and which external message ID proves the action happened.

The result is not an opaque automation claim. It is a visible chain from source message to memory to decision to action.

## Why Minds Is Essential

Memora is powered by a persistent Minds agent. Supabase stores deterministic, source-backed facts. The Memora Mind provides continuity, reasoning, tone adaptation, and relationship-aware suggestions across audience history.

The app connects Minds to YouTube, Discord, and creator approval workflows. Minds is the continuity layer that helps Memora reason about an ongoing relationship instead of treating every comment or message as an isolated event.

## Architecture

```text
YouTube / Discord
        |
        v
Memora ingestion and live listener
        |
        v
Supabase source-backed memory
        |
        v
Persistent Memora Mind
        |
        v
Opportunity and onboarding reasoning
        |
        v
Creator approval or safe narrow auto-send
        |
        v
YouTube / Discord action
        |
        v
Proof receipt
```

- **Next.js:** product interface, API routes, import flows, approval workflows, and proof surfaces.
- **Supabase:** deterministic source records, audience members, interactions, opportunities, actions, connections, and onboarding receipts.
- **Minds:** persistent continuity, reasoning, tone adaptation, and relationship-aware suggestions.
- **Discord worker:** an always-on gateway listener for selected community channels. It runs separately from the web app.

## Demo Walkthrough

1. Start the app with `npm run dev` and open `http://localhost:3000`.
2. Open `/app/import` to connect YouTube, select a video, and import real comments.
3. Open `/app/memory` to inspect source-backed audience history.
4. Open `/app/follow-up` to review a follow-up opportunity and its reason.
5. Approve or dismiss the suggested action. If approved, post the YouTube reply and inspect its proof.
6. Open `/app/import/discord` to connect Discord, select readable channels, and configure onboarding.
7. Run `npm run discord:listen` in a separate terminal.
8. In a selected Discord channel, send: `where is the creator starter guide?`
9. Confirm the reply appears in that same source channel.
10. Open `/app/import/discord` and `/app/proof` to inspect the source message, trigger reason, generated reply, destination channel, sent message ID, and Mind conversation ID.

## Verified Demo Features

- YouTube OAuth connection.
- YouTube video selection.
- YouTube comment import.
- Source-backed audience memory.
- Follow-up opportunity queue.
- Creator approval and dismissal flow.
- Safe YouTube reply posting with proof.
- Discord OAuth bot install.
- Discord channel selection.
- Discord message import from selected channels.
- Discord community memory.
- Mind-guided onboarding settings.
- Live Discord listener.
- Narrow auto-send for clear guide, start, and resource requests.
- Discord onboarding replies sent in the same source channel where the member asked.
- Onboarding receipts shown in `/app/import/discord`.
- Proof page showing the source message, generated reply, trigger reason, sent channel, sent message ID, and Mind conversation ID.
- Creator voice settings: warm, direct, beginner-friendly, professional, and playful.
- Honest sent, drafted, failed, and deterministic fallback receipts.

## Safety Boundaries

- YouTube posting requires explicit creator approval.
- Discord auto-send is limited to narrow onboarding, start, and resource requests.
- Memora assists creators and community teams; it does not replace moderators.
- The app works only on selected public or creator-authorized sources.
- The Discord listener ignores bot messages, including its own messages.
- Duplicate Discord source message IDs are blocked from creating a second onboarding reply.
- Source messages remain visible and linked to stored memory.
- Receipts distinguish sent, drafted, failed, and fallback states honestly.
- Memora does not claim to understand private context it was not given.
- Memora does not autonomously post everywhere or moderate every message.

## Local Setup

### Requirements

- Node.js 22 or newer.
- A Supabase project.
- A Minds Builder API key and persistent Mind.
- Optional YouTube OAuth credentials for the YouTube flow.
- Optional Discord OAuth and bot credentials for the Discord flow.

### Install and configure

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in the server-side credentials. Never commit `.env.local` or expose service-role keys, OAuth secrets, bot tokens, encryption keys, or Minds credentials to the browser.

Apply the SQL migrations in `supabase/migrations` using the Supabase CLI or your project migration workflow, then seed the safe demo workspace:

```bash
npx supabase db push
npm run db:seed
npm run db:doctor
```

For YouTube, register this callback URL:

```text
http://localhost:3000/api/youtube/callback
```

For Discord, register this callback URL:

```text
http://localhost:3000/api/discord/callback
```

The Discord listener reads the persisted connection and onboarding settings from Supabase. It requires `MEMORA_DEV_DB_ACCESS=service_role` for the local development shell and must be run as a separate long-lived process.

## Environment Variables

`.env.example` contains placeholders only. The current application names the YouTube token encryption key `YOUTUBE_TOKEN_ENCRYPTION_KEY`; `TOKEN_ENCRYPTION_KEY` is included as a deployment-template placeholder for environments that standardize on the generic name.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MEMORA_DEV_DB_ACCESS=service_role

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/youtube/callback
YOUTUBE_TOKEN_ENCRYPTION_KEY=
TOKEN_ENCRYPTION_KEY=

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3000/api/discord/callback
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
DISCORD_GUILD_ID=
DISCORD_MONITORED_CHANNEL_IDS=

MINDS_BUILDER_API_KEY=
MEMORA_MIND_ID=
MEMORA_MIND_ALIAS=memora-main

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`DISCORD_PUBLIC_KEY` is reserved for future Discord interaction verification. The current live listener uses the bot token and gateway connection.

## Scripts

### App and quality

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run lint
```

### Database and integrations

```bash
npm run db:doctor
npm run db:seed
npm run youtube:doctor
npm run discord:doctor
npm run discord:inspect-onboarding
npm run discord:listen
```

### Minds verification

```bash
npm run minds:discover
npm run minds:ping
npm run minds:spike
```

## Deployment Notes

- The Next.js app can deploy to Vercel.
- Supabase is the database and deterministic memory store.
- Minds provides the persistent reasoning agent.
- The Discord live listener is an always-on worker. For the demo, run it locally with `npm run discord:listen`.
- In production, run the Discord worker on Railway, Render, Fly.io, or another worker host.
- Do not attempt to permanently host the Discord gateway listener in a Vercel serverless route.
- Keep service-role credentials, OAuth secrets, bot tokens, encryption keys, and Minds credentials server-side.
- The current demo uses an explicit local service-role access gate. Production multi-user auth and ownership policies should be completed before exposing the workspace broadly.

## Current Status

Memora has a verified end-to-end hackathon demo across YouTube and Discord: source ingestion, persistent audience memory, Minds-backed reasoning, creator approval, narrow Discord onboarding assistance, and proof receipts.

The strongest demonstrated loop is:

```text
Observe -> Remember -> Notice -> Reconnect -> Prove
```

The Discord gateway worker is demo-ready but is intentionally operated as a separate process rather than presented as a serverless feature.

## Future Work

- Cloud-hosted Discord worker with health checks and restart policy.
- More public platform connectors.
- Richer moderator workflows and team accounts.
- Scheduled creator follow-ups.
- Analytics on repeated audience needs and unanswered questions.
- Better creator voice training with explicit controls.
- Native Minds deployment when supported.

## The Thesis

Memora is not another dashboard, comment importer, or Discord bot. It is a persistent audience and community memory agent.

It helps creators remember who asked, what they needed, and when the right moment to reconnect arrives.
