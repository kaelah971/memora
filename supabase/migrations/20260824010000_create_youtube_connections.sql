create table public.youtube_connections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  google_account_id text,
  youtube_channel_id text not null,
  youtube_channel_title text not null check (char_length(trim(youtube_channel_title)) > 0),
  youtube_channel_handle text,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default timezone('utc', now()),
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index youtube_connections_creator_unique_idx
  on public.youtube_connections (creator_id);
create unique index youtube_connections_channel_unique_idx
  on public.youtube_connections (youtube_channel_id);
create index youtube_connections_last_synced_idx
  on public.youtube_connections (last_synced_at desc);

create trigger youtube_connections_set_updated_at
before update on public.youtube_connections
for each row execute function public.set_updated_at();

alter table public.youtube_connections enable row level security;

create policy "YouTube connections remain private until auth is mapped"
  on public.youtube_connections for all to anon, authenticated
  using (false) with check (false);

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.youtube_connections to service_role;
