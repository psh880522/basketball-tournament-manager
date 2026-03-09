drop policy if exists "tournaments_select_organizer" on public.tournaments;
create policy "tournaments_select_organizer"
on public.tournaments
for select
using (public.is_organizer());
