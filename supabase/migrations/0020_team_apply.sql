create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  team_name text not null,
  captain_user_id uuid not null,
  contact text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

alter table public.teams
  drop constraint if exists teams_tournament_id_fkey;
alter table public.teams
  add constraint teams_tournament_id_fkey
  foreign key (tournament_id)
  references public.tournaments(id)
  on delete cascade;

alter table public.teams
  drop constraint if exists teams_captain_user_id_fkey;
alter table public.teams
  add constraint teams_captain_user_id_fkey
  foreign key (captain_user_id)
  references auth.users(id)
  on delete cascade;

alter table public.teams
  drop constraint if exists teams_unique_tournament_captain;
alter table public.teams
  add constraint teams_unique_tournament_captain
  unique (tournament_id, captain_user_id);

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

create or replace function public.is_team_manager()
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'team_manager'
  );
end;
$$;

drop policy if exists "teams_select_organizer" on public.teams;
create policy "teams_select_organizer"
on public.teams
for select
using (public.is_organizer());

drop policy if exists "teams_select_team_manager" on public.teams;
create policy "teams_select_team_manager"
on public.teams
for select
using (public.is_team_manager() and captain_user_id = auth.uid());

drop policy if exists "teams_insert_team_manager" on public.teams;
create policy "teams_insert_team_manager"
on public.teams
for insert
with check (public.is_team_manager() and captain_user_id = auth.uid());
