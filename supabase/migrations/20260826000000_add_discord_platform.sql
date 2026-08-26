alter table public.sources drop constraint sources_platform_check;
alter table public.sources add constraint sources_platform_check
  check (platform in ('youtube', 'youtube_live', 'discord', 'manual', 'demo'));

alter table public.sources drop constraint sources_source_type_check;
alter table public.sources add constraint sources_source_type_check
  check (source_type in ('video', 'livestream', 'discord_channel', 'comment_import', 'demo_dataset'));

alter table public.audience_members drop constraint audience_members_platform_check;
alter table public.audience_members add constraint audience_members_platform_check
  check (platform in ('youtube', 'youtube_live', 'discord', 'manual', 'demo'));

alter table public.interactions drop constraint interactions_platform_check;
alter table public.interactions add constraint interactions_platform_check
  check (platform in ('youtube', 'youtube_live', 'discord', 'manual', 'demo'));
