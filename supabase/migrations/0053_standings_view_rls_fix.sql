drop policy if exists "divisions_select_team_manager" on public.divisions;
create policy "divisions_select_team_manager"
  on public.divisions
  for select
  using (
    public.is_team_manager()
  );

drop policy if exists "divisions_select_public_closed" on public.divisions;
create policy "divisions_select_public_closed"
  on public.divisions
  for select
  using (
    exists (
      select 1
      from public.tournaments t
      where t.id = divisions.tournament_id
        and t.status = 'closed'
    )
  );
