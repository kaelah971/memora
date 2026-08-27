create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid references auth.users(id) on delete set null,
  slug text unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index workspaces_created_by_unique_idx
  on public.workspaces (created_by)
  where created_by is not null;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

insert into public.workspaces (id, name, slug, is_demo)
values (
  '00000000-0000-4000-8000-000000000001',
  'Memora Public Demo Workspace',
  'memora-demo',
  true
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    is_demo = true;

alter table public.creators add column workspace_id uuid;

update public.creators
set workspace_id = '00000000-0000-4000-8000-000000000001'
where slug = 'memora-demo';

update public.creators
set workspace_id = gen_random_uuid()
where workspace_id is null;

insert into public.workspaces (id, name, created_by, is_demo)
select workspace_id, display_name, user_id, false
from public.creators
where workspace_id <> '00000000-0000-4000-8000-000000000001'
on conflict (id) do nothing;

alter table public.creators
  alter column workspace_id set not null,
  add constraint creators_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);

create unique index creators_workspace_id_unique_idx on public.creators (workspace_id);
create unique index creators_workspace_id_id_unique_idx on public.creators (workspace_id, id);

alter table public.sources add column workspace_id uuid;
alter table public.audience_members add column workspace_id uuid;
alter table public.interactions add column workspace_id uuid;
alter table public.unresolved_questions add column workspace_id uuid;
alter table public.creator_events add column workspace_id uuid;
alter table public.creator_actions add column workspace_id uuid;
alter table public.youtube_connections add column workspace_id uuid;
alter table public.discord_connections add column workspace_id uuid;
alter table public.discord_onboarding_settings add column workspace_id uuid;
alter table public.discord_onboarding_receipts add column workspace_id uuid;
alter table public.follow_up_mind_reasoning add column workspace_id uuid;

update public.sources child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.audience_members child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.interactions child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.unresolved_questions child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.creator_events child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.creator_actions child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.youtube_connections child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.discord_connections child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.discord_onboarding_settings child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.discord_onboarding_receipts child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

update public.follow_up_mind_reasoning child
set workspace_id = creator.workspace_id
from public.creators creator
where child.creator_id = creator.id;

do $$
declare
  missing_table text;
begin
  select table_name into missing_table
  from (
    values
      ('sources', (select count(*) from public.sources where workspace_id is null)),
      ('audience_members', (select count(*) from public.audience_members where workspace_id is null)),
      ('interactions', (select count(*) from public.interactions where workspace_id is null)),
      ('unresolved_questions', (select count(*) from public.unresolved_questions where workspace_id is null)),
      ('creator_events', (select count(*) from public.creator_events where workspace_id is null)),
      ('creator_actions', (select count(*) from public.creator_actions where workspace_id is null)),
      ('youtube_connections', (select count(*) from public.youtube_connections where workspace_id is null)),
      ('discord_connections', (select count(*) from public.discord_connections where workspace_id is null)),
      ('discord_onboarding_settings', (select count(*) from public.discord_onboarding_settings where workspace_id is null)),
      ('discord_onboarding_receipts', (select count(*) from public.discord_onboarding_receipts where workspace_id is null)),
      ('follow_up_mind_reasoning', (select count(*) from public.follow_up_mind_reasoning where workspace_id is null))
  ) as missing(table_name, row_count)
  where row_count > 0
  limit 1;

  if missing_table is not null then
    raise exception 'Could not assign a workspace to rows in %', missing_table;
  end if;
end;
$$;

alter table public.sources
  alter column workspace_id set not null,
  add constraint sources_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.audience_members
  alter column workspace_id set not null,
  add constraint audience_members_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.interactions
  alter column workspace_id set not null,
  add constraint interactions_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.unresolved_questions
  alter column workspace_id set not null,
  add constraint unresolved_questions_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.creator_events
  alter column workspace_id set not null,
  add constraint creator_events_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.creator_actions
  alter column workspace_id set not null,
  add constraint creator_actions_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.youtube_connections
  alter column workspace_id set not null,
  add constraint youtube_connections_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.discord_connections
  alter column workspace_id set not null,
  add constraint discord_connections_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.discord_onboarding_settings
  alter column workspace_id set not null,
  add constraint discord_onboarding_settings_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.discord_onboarding_receipts
  alter column workspace_id set not null,
  add constraint discord_onboarding_receipts_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);
alter table public.follow_up_mind_reasoning
  alter column workspace_id set not null,
  add constraint follow_up_mind_reasoning_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id);

create index sources_workspace_id_idx on public.sources (workspace_id);
create index audience_members_workspace_id_idx on public.audience_members (workspace_id);
create index interactions_workspace_id_idx on public.interactions (workspace_id);
create index unresolved_questions_workspace_id_idx on public.unresolved_questions (workspace_id);
create index creator_events_workspace_id_idx on public.creator_events (workspace_id);
create index creator_actions_workspace_id_idx on public.creator_actions (workspace_id);
create index youtube_connections_workspace_id_idx on public.youtube_connections (workspace_id);
create index discord_connections_workspace_id_idx on public.discord_connections (workspace_id);
create index discord_onboarding_settings_workspace_id_idx on public.discord_onboarding_settings (workspace_id);
create index discord_onboarding_receipts_workspace_id_idx on public.discord_onboarding_receipts (workspace_id);
create index follow_up_mind_reasoning_workspace_id_idx on public.follow_up_mind_reasoning (workspace_id);

create or replace function public.memora_set_workspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_workspace_id uuid;
begin
  select workspace_id into creator_workspace_id
  from public.creators
  where id = new.creator_id;

  if creator_workspace_id is null then
    raise exception 'Creator % does not belong to a workspace', new.creator_id;
  end if;

  if new.workspace_id is not null and new.workspace_id <> creator_workspace_id then
    raise exception 'Creator and workspace must belong to the same workspace';
  end if;

  new.workspace_id = creator_workspace_id;
  return new;
end;
$$;

create trigger sources_set_workspace_id
before insert or update of creator_id, workspace_id on public.sources
for each row execute function public.memora_set_workspace_id();
create trigger audience_members_set_workspace_id
before insert or update of creator_id, workspace_id on public.audience_members
for each row execute function public.memora_set_workspace_id();
create trigger interactions_set_workspace_id
before insert or update of creator_id, workspace_id on public.interactions
for each row execute function public.memora_set_workspace_id();
create trigger unresolved_questions_set_workspace_id
before insert or update of creator_id, workspace_id on public.unresolved_questions
for each row execute function public.memora_set_workspace_id();
create trigger creator_events_set_workspace_id
before insert or update of creator_id, workspace_id on public.creator_events
for each row execute function public.memora_set_workspace_id();
create trigger creator_actions_set_workspace_id
before insert or update of creator_id, workspace_id on public.creator_actions
for each row execute function public.memora_set_workspace_id();
create trigger youtube_connections_set_workspace_id
before insert or update of creator_id, workspace_id on public.youtube_connections
for each row execute function public.memora_set_workspace_id();
create trigger discord_connections_set_workspace_id
before insert or update of creator_id, workspace_id on public.discord_connections
for each row execute function public.memora_set_workspace_id();
create trigger discord_onboarding_settings_set_workspace_id
before insert or update of creator_id, workspace_id on public.discord_onboarding_settings
for each row execute function public.memora_set_workspace_id();
create trigger discord_onboarding_receipts_set_workspace_id
before insert or update of creator_id, workspace_id on public.discord_onboarding_receipts
for each row execute function public.memora_set_workspace_id();
create trigger follow_up_mind_reasoning_set_workspace_id
before insert or update of creator_id, workspace_id on public.follow_up_mind_reasoning
for each row execute function public.memora_set_workspace_id();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "Workspace members can read their workspace"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "Users can read their memberships"
  on public.workspace_members for select to authenticated
  using (user_id = auth.uid());

create policy "Users can create their own membership"
  on public.workspace_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "Creators are limited to workspace members"
  on public.creators for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Sources are limited to workspace members"
  on public.sources for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Audience members are limited to workspace members"
  on public.audience_members for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Interactions are limited to workspace members"
  on public.interactions for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Questions are limited to workspace members"
  on public.unresolved_questions for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Creator events are limited to workspace members"
  on public.creator_events for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Creator actions are limited to workspace members"
  on public.creator_actions for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "YouTube connections are limited to workspace members"
  on public.youtube_connections for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Discord connections are limited to workspace members"
  on public.discord_connections for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Discord settings are limited to workspace members"
  on public.discord_onboarding_settings for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Discord receipts are limited to workspace members"
  on public.discord_onboarding_receipts for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "Mind reasoning is limited to workspace members"
  on public.follow_up_mind_reasoning for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.workspaces,
  public.workspace_members,
  public.creators,
  public.sources,
  public.audience_members,
  public.interactions,
  public.unresolved_questions,
  public.creator_events,
  public.creator_actions,
  public.youtube_connections,
  public.discord_connections,
  public.discord_onboarding_settings,
  public.discord_onboarding_receipts,
  public.follow_up_mind_reasoning
to service_role;

grant execute on function public.is_workspace_member(uuid) to authenticated;
