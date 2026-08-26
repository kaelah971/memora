create table public.discord_connections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creators(id) on delete cascade,
  guild_id text not null check (guild_id ~ '^[0-9]{17,20}$'),
  guild_name text not null check (char_length(trim(guild_name)) > 0),
  installed_by_user_id text,
  selected_channel_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_import_at timestamptz
);

create index discord_connections_guild_id_idx on public.discord_connections (guild_id);

create trigger discord_connections_set_updated_at
before update on public.discord_connections
for each row execute function public.set_updated_at();

alter table public.discord_connections enable row level security;

create policy "Discord connections remain private until auth is mapped"
  on public.discord_connections for all to anon, authenticated
  using (false) with check (false);
