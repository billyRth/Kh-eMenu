-- Menu look ("vibe") picked in Settings; ids match src/lib/themes.ts.
alter table public.restaurants add column theme text not null default 'warm'
  check (theme in ('warm', 'cafe', 'night', 'street', 'garden', 'royal'));
