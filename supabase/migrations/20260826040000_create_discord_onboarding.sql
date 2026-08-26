create table public.discord_onboarding_settings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creators(id) on delete cascade,
  discord_connection_id uuid not null unique references public.discord_connections(id) on delete cascade,
  enabled boolean not null default false,
  send_mode text not null default 'draft_only' check (send_mode in ('draft_only', 'auto_send_welcome_only', 'auto_send_clear_guide_requests')),
  welcome_channel_id text,
  resource_channel_id text,
  question_channel_id text,
  support_channel_id text,
  builder_channel_id text,
  beginner_guide_text text not null default '' check (char_length(beginner_guide_text) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index discord_onboarding_settings_connection_idx on public.discord_onboarding_settings (discord_connection_id);

create trigger discord_onboarding_settings_set_updated_at
before update on public.discord_onboarding_settings
for each row execute function public.set_updated_at();

create table public.discord_onboarding_receipts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  discord_connection_id uuid not null references public.discord_connections(id) on delete cascade,
  guild_id text not null check (guild_id ~ '^[0-9]{17,20}$'),
  channel_id text not null,
  discord_user_id text not null,
  discord_username text not null check (char_length(trim(discord_username)) > 0),
  trigger_type text not null check (trigger_type in ('member_join', 'first_message', 'guide_request', 'manual_test')),
  source_message_id text,
  mind_conversation_id text,
  generated_message text not null check (char_length(generated_message) <= 2000),
  sent_message_id text,
  status text not null check (status in ('drafted', 'sent', 'skipped', 'failed')),
  reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index discord_onboarding_receipts_creator_created_idx
  on public.discord_onboarding_receipts (creator_id, created_at desc);
create index discord_onboarding_receipts_member_trigger_idx
  on public.discord_onboarding_receipts (creator_id, discord_user_id, trigger_type, created_at desc);
create unique index discord_onboarding_receipts_source_message_unique_idx
  on public.discord_onboarding_receipts (creator_id, source_message_id)
  where source_message_id is not null and status in ('drafted', 'sent', 'skipped');

alter table public.discord_onboarding_settings enable row level security;
alter table public.discord_onboarding_receipts enable row level security;

create policy "Discord onboarding settings remain private until auth is mapped"
  on public.discord_onboarding_settings for all to anon, authenticated
  using (false) with check (false);

create policy "Discord onboarding receipts remain private until auth is mapped"
  on public.discord_onboarding_receipts for all to anon, authenticated
  using (false) with check (false);

grant select, insert, update, delete on table
  public.discord_onboarding_settings,
  public.discord_onboarding_receipts
to service_role;
