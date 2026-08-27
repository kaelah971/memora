-- A YouTube channel may be connected in the public demo and in a creator's
-- private workspace. Keep the channel unique within each workspace instead.
update public.youtube_connections connection_row
set workspace_id = creator.workspace_id
from public.creators creator
where connection_row.workspace_id is null
  and connection_row.creator_id = creator.id
  and creator.workspace_id is not null;

do $$
begin
  if exists (
    select 1
    from public.youtube_connections
    where workspace_id is null
  ) then
    raise exception 'Could not assign a workspace to existing YouTube connections';
  end if;
end;
$$;

drop index if exists public.youtube_connections_channel_unique_idx;

create unique index youtube_connections_workspace_channel_unique_idx
  on public.youtube_connections (workspace_id, youtube_channel_id);
