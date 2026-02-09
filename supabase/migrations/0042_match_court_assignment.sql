alter table public.matches enable row level security;

drop policy if exists "matches_update_organizer" on public.matches;
create policy "matches_update_organizer"
  on public.matches
  for update
  using (public.is_organizer())
  with check (public.is_organizer());
