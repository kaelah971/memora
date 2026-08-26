grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.creators,
  public.sources,
  public.audience_members,
  public.interactions,
  public.unresolved_questions,
  public.creator_events,
  public.creator_actions
to service_role;
