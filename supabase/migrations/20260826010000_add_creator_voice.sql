alter table public.creators
  add column voice_preference text not null default 'warm';

alter table public.creators
  add constraint creators_voice_preference_check
  check (voice_preference in ('warm', 'direct', 'beginner-friendly', 'professional', 'playful'));
