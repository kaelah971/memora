create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) > 0),
  slug text,
  timezone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index creators_slug_unique_idx
  on public.creators (slug)
  where slug is not null;

create index creators_user_id_idx on public.creators (user_id);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'youtube_live', 'manual', 'demo')),
  source_type text not null check (source_type in ('video', 'livestream', 'comment_import', 'demo_dataset')),
  external_id text,
  title text not null check (char_length(trim(title)) > 0),
  url text,
  published_at timestamptz,
  imported_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index sources_creator_id_idx on public.sources (creator_id);
create index sources_creator_published_at_idx on public.sources (creator_id, published_at desc);
create unique index sources_external_id_unique_idx
  on public.sources (creator_id, platform, external_id)
  where external_id is not null;

create table public.audience_members (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'youtube_live', 'manual', 'demo')),
  platform_user_id text,
  display_name text not null check (char_length(trim(display_name)) > 0),
  avatar_url text,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (last_seen_at >= first_seen_at)
);

create index audience_members_creator_id_idx on public.audience_members (creator_id);
create index audience_members_creator_last_seen_idx
  on public.audience_members (creator_id, last_seen_at desc);
create unique index audience_members_platform_identity_unique_idx
  on public.audience_members (creator_id, platform, platform_user_id)
  where platform_user_id is not null;

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  audience_member_id uuid not null references public.audience_members(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  platform text not null check (platform in ('youtube', 'youtube_live', 'manual', 'demo')),
  interaction_type text not null check (interaction_type in ('comment', 'livestream_message', 'creator_reply')),
  external_id text,
  text text not null,
  published_at timestamptz not null,
  creator_replied boolean not null default false,
  parent_interaction_id uuid references public.interactions(id) on delete set null,
  like_count integer check (like_count is null or like_count >= 0),
  reply_count integer check (reply_count is null or reply_count >= 0),
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index interactions_creator_published_at_idx
  on public.interactions (creator_id, published_at desc);
create index interactions_audience_member_published_at_idx
  on public.interactions (audience_member_id, published_at desc);
create index interactions_source_id_idx on public.interactions (source_id);
create index interactions_parent_interaction_id_idx on public.interactions (parent_interaction_id);
create unique index interactions_external_id_unique_idx
  on public.interactions (creator_id, platform, external_id)
  where external_id is not null;

create table public.unresolved_questions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  audience_member_id uuid not null references public.audience_members(id) on delete cascade,
  interaction_id uuid not null references public.interactions(id) on delete cascade,
  question_text text not null check (char_length(trim(question_text)) > 0),
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  resolution_type text,
  resolved_by_interaction_id uuid references public.interactions(id) on delete set null,
  resolved_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'open' and resolved_at is null and dismissed_at is null)
    or (status = 'answered' and resolved_at is not null and dismissed_at is null)
    or (status = 'dismissed' and dismissed_at is not null and resolved_at is null)
  )
);

create index unresolved_questions_creator_status_idx
  on public.unresolved_questions (creator_id, status, created_at desc);
create index unresolved_questions_audience_member_status_idx
  on public.unresolved_questions (audience_member_id, status);
create unique index unresolved_questions_open_interaction_unique_idx
  on public.unresolved_questions (interaction_id)
  where status = 'open';

create table public.creator_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  event_type text not null check (event_type in ('content_published', 'livestream_started', 'product_update', 'manual_event')),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  processed_for_followups_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index creator_events_creator_occurred_at_idx
  on public.creator_events (creator_id, occurred_at desc);
create unique index creator_events_external_id_unique_idx
  on public.creator_events (creator_id, event_type, external_id)
  where external_id is not null;

create table public.creator_actions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  audience_member_id uuid references public.audience_members(id) on delete set null,
  interaction_id uuid references public.interactions(id) on delete set null,
  creator_event_id uuid references public.creator_events(id) on delete set null,
  action_type text not null check (action_type in ('reply', 'follow_up', 'dismiss', 'mark_answered')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed', 'completed', 'failed')),
  text text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index creator_actions_creator_created_at_idx
  on public.creator_actions (creator_id, created_at desc);
create index creator_actions_creator_status_idx
  on public.creator_actions (creator_id, status, created_at desc);
create index creator_actions_audience_member_idx on public.creator_actions (audience_member_id);
create index creator_actions_interaction_idx on public.creator_actions (interaction_id);
create index creator_actions_creator_event_idx on public.creator_actions (creator_event_id);

create trigger creators_set_updated_at
before update on public.creators
for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create trigger audience_members_set_updated_at
before update on public.audience_members
for each row execute function public.set_updated_at();

create trigger interactions_set_updated_at
before update on public.interactions
for each row execute function public.set_updated_at();

create trigger unresolved_questions_set_updated_at
before update on public.unresolved_questions
for each row execute function public.set_updated_at();

create trigger creator_events_set_updated_at
before update on public.creator_events
for each row execute function public.set_updated_at();

alter table public.creators enable row level security;
alter table public.sources enable row level security;
alter table public.audience_members enable row level security;
alter table public.interactions enable row level security;
alter table public.unresolved_questions enable row level security;
alter table public.creator_events enable row level security;
alter table public.creator_actions enable row level security;

create policy "Creators remain private until auth is mapped"
  on public.creators for all to anon, authenticated
  using (false) with check (false);

create policy "Sources remain private until auth is mapped"
  on public.sources for all to anon, authenticated
  using (false) with check (false);

create policy "Audience members remain private until auth is mapped"
  on public.audience_members for all to anon, authenticated
  using (false) with check (false);

create policy "Interactions remain private until auth is mapped"
  on public.interactions for all to anon, authenticated
  using (false) with check (false);

create policy "Questions remain private until auth is mapped"
  on public.unresolved_questions for all to anon, authenticated
  using (false) with check (false);

create policy "Creator events remain private until auth is mapped"
  on public.creator_events for all to anon, authenticated
  using (false) with check (false);

create policy "Creator actions remain private until auth is mapped"
  on public.creator_actions for all to anon, authenticated
  using (false) with check (false);
