create table if not exists public.standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  division_id uuid not null,
  group_id uuid not null,
  team_id uuid not null,
  wins integer not null default 0,
  losses integer not null default 0,
  points_for integer not null default 0,
  points_against integer not null default 0,
  points_diff integer not null default 0,
  rank integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.standings enable row level security;

alter table public.standings
  drop constraint if exists standings_tournament_id_fkey;
alter table public.standings
  add constraint standings_tournament_id_fkey
  foreign key (tournament_id)
  references public.tournaments(id)
  on delete cascade;

alter table public.standings
  drop constraint if exists standings_division_id_fkey;
alter table public.standings
  add constraint standings_division_id_fkey
  foreign key (division_id)
  references public.divisions(id)
  on delete cascade;

alter table public.standings
  drop constraint if exists standings_group_id_fkey;
alter table public.standings
  add constraint standings_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete cascade;

alter table public.standings
  drop constraint if exists standings_team_id_fkey;
alter table public.standings
  add constraint standings_team_id_fkey
  foreign key (team_id)
  references public.teams(id)
  on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'standings_group_team_key'
      and conrelid = 'public.standings'::regclass
  ) then
    alter table public.standings
      add constraint standings_group_team_key
      unique (group_id, team_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'standings_wins_check'
      and conrelid = 'public.standings'::regclass
  ) then
    alter table public.standings
      add constraint standings_wins_check
      check (wins >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'standings_losses_check'
      and conrelid = 'public.standings'::regclass
  ) then
    alter table public.standings
      add constraint standings_losses_check
      check (losses >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'standings_points_for_check'
      and conrelid = 'public.standings'::regclass
  ) then
    alter table public.standings
      add constraint standings_points_for_check
      check (points_for >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'standings_points_against_check'
      and conrelid = 'public.standings'::regclass
  ) then
    alter table public.standings
      add constraint standings_points_against_check
      check (points_against >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'standings_rank_check'
      and conrelid = 'public.standings'::regclass
  ) then
    alter table public.standings
      add constraint standings_rank_check
      check (rank >= 1);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_standings_updated_at'
  ) then
    create trigger set_standings_updated_at
      before update on public.standings
      for each row execute function public.set_updated_at();
  end if;
end $$;

drop policy if exists "standings_select_organizer" on public.standings;
create policy "standings_select_organizer"
  on public.standings
  for select
  using (public.is_organizer());

drop policy if exists "standings_insert_organizer" on public.standings;
create policy "standings_insert_organizer"
  on public.standings
  for insert
  with check (public.is_organizer());

drop policy if exists "standings_update_organizer" on public.standings;
create policy "standings_update_organizer"
  on public.standings
  for update
  using (public.is_organizer())
  with check (public.is_organizer());
