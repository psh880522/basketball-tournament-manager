create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  name text not null,
  group_size integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null,
  name text not null,
  "order" integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_teams (
  group_id uuid not null,
  team_id uuid not null,
  created_at timestamptz not null default now(),
  unique (group_id, team_id)
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  division_id uuid not null,
  group_id uuid,
  team_a_id uuid not null,
  team_b_id uuid not null,
  court_id uuid,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

alter table public.divisions enable row level security;
alter table public.groups enable row level security;
alter table public.group_teams enable row level security;
alter table public.courts enable row level security;
alter table public.matches enable row level security;

alter table public.divisions
  drop constraint if exists divisions_tournament_id_fkey;
alter table public.divisions
  add constraint divisions_tournament_id_fkey
  foreign key (tournament_id)
  references public.tournaments(id)
  on delete cascade;

alter table public.groups
  drop constraint if exists groups_division_id_fkey;
alter table public.groups
  add constraint groups_division_id_fkey
  foreign key (division_id)
  references public.divisions(id)
  on delete cascade;

alter table public.group_teams
  drop constraint if exists group_teams_group_id_fkey;
alter table public.group_teams
  add constraint group_teams_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete cascade;

alter table public.group_teams
  drop constraint if exists group_teams_team_id_fkey;
alter table public.group_teams
  add constraint group_teams_team_id_fkey
  foreign key (team_id)
  references public.teams(id)
  on delete cascade;

alter table public.courts
  drop constraint if exists courts_tournament_id_fkey;
alter table public.courts
  add constraint courts_tournament_id_fkey
  foreign key (tournament_id)
  references public.tournaments(id)
  on delete cascade;

alter table public.matches
  drop constraint if exists matches_tournament_id_fkey;
alter table public.matches
  add constraint matches_tournament_id_fkey
  foreign key (tournament_id)
  references public.tournaments(id)
  on delete cascade;

alter table public.matches
  drop constraint if exists matches_division_id_fkey;
alter table public.matches
  add constraint matches_division_id_fkey
  foreign key (division_id)
  references public.divisions(id)
  on delete cascade;

alter table public.matches
  drop constraint if exists matches_group_id_fkey;
alter table public.matches
  add constraint matches_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete set null;

alter table public.matches
  drop constraint if exists matches_team_a_id_fkey;
alter table public.matches
  add constraint matches_team_a_id_fkey
  foreign key (team_a_id)
  references public.teams(id)
  on delete cascade;

alter table public.matches
  drop constraint if exists matches_team_b_id_fkey;
alter table public.matches
  add constraint matches_team_b_id_fkey
  foreign key (team_b_id)
  references public.teams(id)
  on delete cascade;

alter table public.matches
  drop constraint if exists matches_court_id_fkey;
alter table public.matches
  add constraint matches_court_id_fkey
  foreign key (court_id)
  references public.courts(id)
  on delete set null;

alter table public.teams
  drop constraint if exists teams_division_id_fkey;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teams'
      and column_name = 'division_id'
  ) then
    alter table public.teams add column division_id uuid;
  end if;
end $$;

alter table public.teams
  add constraint teams_division_id_fkey
  foreign key (division_id)
  references public.divisions(id)
  on delete set null;

create or replace function public.can_view_group(group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.group_teams gt
    join public.teams t on t.id = gt.team_id
    where gt.group_id = group_id
      and t.captain_user_id = auth.uid()
  );
end;
$$;

drop policy if exists "divisions_select_organizer" on public.divisions;
create policy "divisions_select_organizer"
  on public.divisions
  for select
  using (public.is_organizer());

drop policy if exists "divisions_insert_organizer" on public.divisions;
create policy "divisions_insert_organizer"
  on public.divisions
  for insert
  with check (public.is_organizer());

drop policy if exists "groups_select_organizer" on public.groups;
create policy "groups_select_organizer"
  on public.groups
  for select
  using (public.is_organizer());

drop policy if exists "groups_select_team_manager" on public.groups;
create policy "groups_select_team_manager"
  on public.groups
  for select
  using (public.is_team_manager() and public.can_view_group(id));

drop policy if exists "groups_insert_organizer" on public.groups;
create policy "groups_insert_organizer"
  on public.groups
  for insert
  with check (public.is_organizer());

drop policy if exists "group_teams_select_organizer" on public.group_teams;
create policy "group_teams_select_organizer"
  on public.group_teams
  for select
  using (public.is_organizer());

drop policy if exists "group_teams_select_team_manager" on public.group_teams;
create policy "group_teams_select_team_manager"
  on public.group_teams
  for select
  using (public.is_team_manager() and public.can_manage_team(team_id));

drop policy if exists "group_teams_insert_organizer" on public.group_teams;
create policy "group_teams_insert_organizer"
  on public.group_teams
  for insert
  with check (public.is_organizer());

drop policy if exists "courts_select_organizer" on public.courts;
create policy "courts_select_organizer"
  on public.courts
  for select
  using (public.is_organizer());

drop policy if exists "courts_insert_organizer" on public.courts;
create policy "courts_insert_organizer"
  on public.courts
  for insert
  with check (public.is_organizer());

drop policy if exists "matches_select_organizer" on public.matches;
create policy "matches_select_organizer"
  on public.matches
  for select
  using (public.is_organizer());

drop policy if exists "matches_select_team_manager" on public.matches;
create policy "matches_select_team_manager"
  on public.matches
  for select
  using (
    public.is_team_manager()
    and (
      public.can_manage_team(team_a_id)
      or public.can_manage_team(team_b_id)
    )
  );

drop policy if exists "matches_insert_organizer" on public.matches;
create policy "matches_insert_organizer"
  on public.matches
  for insert
  with check (public.is_organizer());
