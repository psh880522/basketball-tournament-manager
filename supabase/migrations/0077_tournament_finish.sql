alter table public.tournaments
  drop constraint if exists tournaments_status_check;

alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('draft', 'open', 'closed', 'finished'));

drop policy if exists "tournaments_select_public" on public.tournaments;
create policy "tournaments_select_public"
on public.tournaments
for select
using (status in ('open', 'closed', 'finished'));
