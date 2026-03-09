alter table public.teams
  add column if not exists created_by uuid;

update public.teams
set created_by = captain_user_id
where created_by is null;

alter table public.teams
  alter column created_by set default auth.uid();

alter table public.teams
  alter column created_by set not null;

alter table public.teams
  drop constraint if exists teams_created_by_fkey;

alter table public.teams
  add constraint teams_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete restrict;

alter table public.teams
  add column if not exists created_at timestamptz not null default now();

alter table public.teams
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_in_team text not null check (role_in_team in ('manager','player')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.tournament_team_applications (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create index if not exists tournament_team_applications_tournament_id_idx
  on public.tournament_team_applications (tournament_id);

create index if not exists tournament_team_applications_team_id_idx
  on public.tournament_team_applications (team_id);

create index if not exists tournament_team_applications_tournament_status_idx
  on public.tournament_team_applications (tournament_id, status);

alter table public.team_members enable row level security;
alter table public.tournament_team_applications enable row level security;

create or replace function public.is_team_member_for_team(team_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_uuid
      and tm.user_id = auth.uid()
  );
end;
$$;

create or replace function public.is_team_manager_for_team(team_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.team_members tm
    where tm.team_id = team_uuid
      and tm.user_id = auth.uid()
      and tm.role_in_team = 'manager'
  );
end;
$$;

drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members"
on public.teams
for select
using (public.is_team_member_for_team(id));

drop policy if exists "teams_insert_members" on public.teams;
create policy "teams_insert_members"
on public.teams
for insert
with check (created_by = auth.uid());

drop policy if exists "teams_update_manager" on public.teams;
create policy "teams_update_manager"
on public.teams
for update
using (public.is_team_manager_for_team(id) or public.is_organizer())
with check (public.is_team_manager_for_team(id) or public.is_organizer());

drop policy if exists "teams_delete_manager" on public.teams;
create policy "teams_delete_manager"
on public.teams
for delete
using (public.is_team_manager_for_team(id) or public.is_organizer());

drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select"
on public.team_members
for select
using (public.is_team_member_for_team(team_id) or public.is_organizer());

drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert"
on public.team_members
for insert
with check (
  public.is_organizer()
  or public.is_team_manager_for_team(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_id
      and t.created_by = auth.uid()
  )
);

drop policy if exists "team_members_update" on public.team_members;
create policy "team_members_update"
on public.team_members
for update
using (public.is_team_manager_for_team(team_id) or public.is_organizer())
with check (public.is_team_manager_for_team(team_id) or public.is_organizer());

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete"
on public.team_members
for delete
using (public.is_team_manager_for_team(team_id) or public.is_organizer());

drop policy if exists "tournament_team_applications_select" on public.tournament_team_applications;
create policy "tournament_team_applications_select"
on public.tournament_team_applications
for select
using (public.is_organizer() or public.is_team_member_for_team(team_id));

drop policy if exists "tournament_team_applications_insert" on public.tournament_team_applications;
create policy "tournament_team_applications_insert"
on public.tournament_team_applications
for insert
with check (
  public.is_team_manager_for_team(team_id)
  and applied_by = auth.uid()
);

drop policy if exists "tournament_team_applications_update" on public.tournament_team_applications;
create policy "tournament_team_applications_update"
on public.tournament_team_applications
for update
using (public.is_organizer())
with check (public.is_organizer());
