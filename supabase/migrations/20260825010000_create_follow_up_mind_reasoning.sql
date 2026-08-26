create table public.follow_up_mind_reasoning (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  opportunity_id text not null,
  interaction_id uuid not null references public.interactions(id) on delete cascade,
  mind_id text not null,
  conversation_id text not null,
  reasoning_text text not null,
  tone text not null,
  variants jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index follow_up_mind_reasoning_opportunity_unique_idx
  on public.follow_up_mind_reasoning (creator_id, opportunity_id);
create index follow_up_mind_reasoning_interaction_idx
  on public.follow_up_mind_reasoning (creator_id, interaction_id);

create trigger follow_up_mind_reasoning_set_updated_at
before update on public.follow_up_mind_reasoning
for each row execute function public.set_updated_at();

alter table public.follow_up_mind_reasoning enable row level security;

create policy "Follow-up Mind reasoning remains private until auth is mapped"
  on public.follow_up_mind_reasoning for all to anon, authenticated
  using (false) with check (false);

grant select, insert, update, delete on table public.follow_up_mind_reasoning to service_role;
