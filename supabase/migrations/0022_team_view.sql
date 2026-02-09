create or replace function public.can_view_tournament_as_team_manager(
  tournament_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.teams t
    where t.tournament_id = tournament_id
      and t.captain_user_id = auth.uid()
  );
end;
$$;

drop policy if exists "tournaments_select_team_manager" on public.tournaments;
create policy "tournaments_select_team_manager"
on public.tournaments
for select
using (
  public.is_team_manager()
  and public.can_view_tournament_as_team_manager(id)
);
