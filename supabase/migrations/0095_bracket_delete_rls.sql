-- matches / groups / group_teams DELETE policy (bracket overwrite 용)

-- matches: organizer 삭제 허용
drop policy if exists "matches_delete_organizer" on public.matches;
create policy "matches_delete_organizer"
  on public.matches
  for delete
  using (public.is_organizer());

-- groups: organizer 삭제 허용 (group_teams는 CASCADE 삭제)
drop policy if exists "groups_delete_organizer" on public.groups;
create policy "groups_delete_organizer"
  on public.groups
  for delete
  using (public.is_organizer());

-- group_teams: organizer 삭제 허용 (CASCADE 외 직접 삭제 시)
drop policy if exists "group_teams_delete_organizer" on public.group_teams;
create policy "group_teams_delete_organizer"
  on public.group_teams
  for delete
  using (public.is_organizer());
