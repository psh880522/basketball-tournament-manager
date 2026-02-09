do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teams_status_check'
      and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams
      add constraint teams_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

drop policy if exists "teams_update_organizer" on public.teams;
create policy "teams_update_organizer"
on public.teams
for update
using (public.is_organizer())
with check (public.is_organizer() and status in ('approved', 'rejected'));
