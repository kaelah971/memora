create unique index creator_actions_reply_reservation_unique_idx
  on public.creator_actions (creator_id, interaction_id, creator_event_id)
  where action_type = 'reply'
    and status in ('pending', 'completed')
    and interaction_id is not null
    and creator_event_id is not null;
