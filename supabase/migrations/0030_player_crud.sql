create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  name text not null,
  number integer,
  position text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

alter table public.players
  drop constraint if exists players_team_id_fkey;
alter table public.players
  add constraint players_team_id_fkey
  foreign key (team_id)
  references public.teams(id)
  on delete cascade;

create unique index if not exists players_unique_team_number
  on public.players (team_id, number)
  where number is not null;

create or replace function public.set_player_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_player_updated_at on public.players;
create trigger set_player_updated_at
before update on public.players
for each row execute function public.set_player_updated_at();

create or replace function public.can_manage_team(team_id uuid)
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
    where t.id = team_id
      and t.captain_user_id = auth.uid()
  );
end;
$$;

drop policy if exists "players_select_team_manager" on public.players;
create policy "players_select_team_manager"
on public.players
for select
using (public.is_team_manager() and public.can_manage_team(team_id));

drop policy if exists "players_insert_team_manager" on public.players;
create policy "players_insert_team_manager"
on public.players
for insert
with check (public.is_team_manager() and public.can_manage_team(team_id));

drop policy if exists "players_update_team_manager" on public.players;
create policy "players_update_team_manager"
on public.players
for update
using (public.is_team_manager() and public.can_manage_team(team_id))
with check (public.is_team_manager() and public.can_manage_team(team_id));

drop policy if exists "players_delete_team_manager" on public.players;
create policy "players_delete_team_manager"
on public.players
for delete
using (public.is_team_manager() and public.can_manage_team(team_id));
