# Supabase P1 Foundation

P1 persists deterministic Memora facts in Supabase/Postgres. It does not run Minds reasoning, detect questions with AI, or create follow-up recommendations.

## Environment

Copy `.env.example` to `.env.local` and fill in the project values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MEMORA_DEV_DB_ACCESS=service_role
```

The service-role key is server-side only. `MEMORA_DEV_DB_ACCESS=service_role` is an explicit local-development opt-in for the P1 app shell and seed tooling. Production workspace reads remain disabled until authentication and RLS ownership policies are implemented.

## Apply Migrations

The schema is versioned under `supabase/migrations/`. With the Supabase CLI installed and a project created:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Do not use `drizzle push` or dashboard-only schema changes. The migration creates tables, foreign keys, constraints, indexes, updated-at triggers, and restrictive RLS policies.

## Explicit Data API Grants

This project does not rely on automatic exposure for new public tables. The versioned migration `20260824000000_grant_service_role_memora_tables.sql` explicitly grants `service_role` schema usage and `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on the seven current P1 tables. No sequence grants are required because the P1 primary keys use UUID defaults.

The grant is for trusted server-side seed and development access only. `anon` and `authenticated` intentionally receive no table grants until authentication and creator-ownership RLS policies are implemented.

## Seed And Doctor

Seed one idempotent demo workspace:

```bash
npm run db:seed
```

Check required tables and the demo creator:

```bash
npm run db:doctor
```

Neither command prints privileged credentials. The seed uses stable UUIDs and upserts by primary key, so rerunning it does not duplicate the demo dataset.

## Data Boundary

Stored in P1:

- creator workspaces;
- source records;
- platform-scoped audience identities;
- raw interactions with original text;
- explicit unresolved question states;
- creator-side events;
- creator action history.

Not stored in P1:

- loyalty, intent, risk, or recommendation scores;
- embeddings or vector memories;
- AI-generated profiles or question detection;
- Minds conclusions.

The `anon` and `authenticated` roles are denied access until creator ownership can be mapped to authenticated users. Supabase service-role access bypasses RLS and is limited to explicit server-side development tooling in this milestone.

P1.5 YouTube OAuth, token handling, bounded video listing, comment normalization, quota limits, and manual Google Cloud setup are documented in `docs/youtube-p1-5.md`.
