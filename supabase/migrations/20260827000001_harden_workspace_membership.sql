drop policy if exists "Users can create their own membership" on public.workspace_members;

revoke insert on table public.workspace_members from authenticated;
