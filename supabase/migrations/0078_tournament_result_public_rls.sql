drop policy if exists "matches_select_public_finished" on public.matches;
create policy "matches_select_public_finished"
  on public.matches
  for select
  using (
    exists (
      select 1
      from public.tournaments t
      where t.id = matches.tournament_id
        and t.status in ('closed', 'finished')
    )
  );

-- Extend existing public-closed policies to include finished.
drop policy if exists "standings_select_public_closed" on public.standings;
create policy "standings_select_public_closed"
  on public.standings
  for select
  using (
    exists (
      select 1
      from public.tournaments t
      where t.id = standings.tournament_id
        and t.status in ('closed', 'finished')
    )
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
        and t.status in ('closed', 'finished')
    )
  );

drop policy if exists "groups_select_public_closed" on public.groups;
create policy "groups_select_public_closed"
  on public.groups
  for select
  using (
    exists (
      select 1
      from public.divisions d
      join public.tournaments t on t.id = d.tournament_id
      where d.id = groups.division_id
        and t.status in ('closed', 'finished')
    )
  );

drop policy if exists "teams_select_public_closed" on public.teams;
create policy "teams_select_public_closed"
  on public.teams
  for select
  using (
    exists (
      select 1
      from public.group_teams gt
      join public.groups g on g.id = gt.group_id
      join public.divisions d on d.id = g.division_id
      join public.tournaments t on t.id = d.tournament_id
      where gt.team_id = teams.id
        and t.status in ('closed', 'finished')
    )
  );
