drop policy if exists "standings_select_team_manager" on public.standings;
create policy "standings_select_team_manager"
  on public.standings
  for select
  using (
    public.is_team_manager()
    and public.can_view_group(group_id)
  );

drop policy if exists "standings_select_public_closed" on public.standings;
create policy "standings_select_public_closed"
  on public.standings
  for select
  using (
    exists (
      select 1
      from public.tournaments t
      where t.id = standings.tournament_id
        and t.status = 'closed'
    )
  );

drop policy if exists "divisions_select_team_manager" on public.divisions;
create policy "divisions_select_team_manager"
  on public.divisions
  for select
  using (
    public.is_team_manager()
    and exists (
      select 1
      from public.groups g
      where g.division_id = divisions.id
        and public.can_view_group(g.id)
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
        and t.status = 'closed'
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
        and t.status = 'closed'
    )
  );

drop policy if exists "teams_select_group_viewer" on public.teams;
create policy "teams_select_group_viewer"
  on public.teams
  for select
  using (
    public.is_team_manager()
    and exists (
      select 1
      from public.group_teams gt
      where gt.team_id = teams.id
        and public.can_view_group(gt.group_id)
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
        and t.status = 'closed'
    )
  );
