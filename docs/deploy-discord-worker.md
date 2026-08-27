# Deploy the Discord Listener Worker

The Discord listener must run as a long-lived worker. Do not deploy it as a Vercel serverless function: Discord Gateway connections need a persistent process.

## Worker Command

Use this start command on Railway or Render:

```text
npm run discord:listen
```

Use Node.js 22 or newer. The repository already declares this requirement in `package.json`.

Run one worker instance for a bot token unless you intentionally configure Discord sharding. Multiple uncoordinated workers can process the same message more than once.

## Environment Variables

Set these variables on the worker. Keep secrets in the platform secret manager and never commit them:

```text
DISCORD_BOT_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MINDS_BUILDER_API_KEY=
MEMORA_MIND_ID=
```

The Vercel web app separately needs the Discord OAuth variables:

```text
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=
```

The worker does not need `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, or `DISCORD_REDIRECT_URI` to receive Gateway events. It uses the bot token and reads the saved workspace connections from Supabase.

## Discord Setup

1. Enable the **Message Content Intent** for the bot in the Discord Developer Portal.
2. Invite the bot to every guild that a creator connects from the Memora web app.
3. Give the bot `View Channel`, `Read Message History`, and `Send Messages` in each channel selected in Memora.
4. Deploy the worker and confirm its startup logs include `Discord client ready` and `Listening for workspace-scoped onboarding messages`.

The worker loads every workspace-scoped Discord connection from Supabase. Each incoming message is matched by guild ID, then checked against that workspace's saved channel IDs and onboarding settings. It ignores bot messages, unclear messages, and ambiguous or unknown guild mappings. Unconfigured channels can be persisted as read-only source facts when they contain a clear guide request, but they never trigger an onboarding reply.

## Railway

Create a new **Worker** service from the repository. Configure the environment variables above, set the start command to `npm run discord:listen`, and deploy from the production branch.

Use Railway's restart policy so the worker restarts after a process or network failure. The listener reconnects through `discord.js` after transient Gateway failures; a restart also reloads all saved workspace connections and settings.

## Render

Create a **Background Worker** from the repository. Configure the environment variables above and set the start command to `npm run discord:listen`. Deploy from the production branch and enable automatic deploys if desired.

Use Render's automatic restart behavior. Keep the worker separate from the web service so Vercel and Render do not compete for the same long-lived process.

## Expected Logs

Startup logs include:

```text
[discord listener] Discord listener booting
[discord listener] Supabase connected
[discord listener] Loaded connected guild count=...
[discord listener] Discord client ready
[discord listener] Listening for workspace-scoped onboarding messages
```

Per-message logs include only IDs, booleans, classifications, outcomes, and safe error categories. They do not print Discord, Supabase, or Minds credentials. A sent or failed onboarding attempt is written to `discord_onboarding_receipts` with its creator and workspace association.

## Verification

Before deploying, run:

```text
npm run typecheck
npm test
npm run lint
npm run build
npm run discord:listen
```

For the last command locally, provide the same variables through `.env.local` or the shell environment. Stop it with `Ctrl+C` after confirming it reaches Discord Gateway readiness.
