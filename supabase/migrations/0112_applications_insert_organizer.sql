drop policy if exists "tournament_team_applications_insert" on public.tournament_team_applications;
create policy "tournament_team_applications_insert"
on public.tournament_team_applications
for insert
with check (
  public.is_organizer()
  or (
    public.is_team_manager_for_team(team_id)
    and applied_by = auth.uid()
  )
);
