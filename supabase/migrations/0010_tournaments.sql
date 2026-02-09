create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  start_date date not null,
  end_date date not null,
  format text,
  max_teams integer,
  status text not null default 'draft',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'format'
  ) then
    alter table public.tournaments add column format text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'max_teams'
  ) then
    alter table public.tournaments add column max_teams integer;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'created_by'
  ) then
    alter table public.tournaments add column created_by uuid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'updated_at'
  ) then
    alter table public.tournaments add column updated_at timestamptz not null default now();
  end if;
end $$;

alter table public.tournaments
  drop constraint if exists tournaments_created_by_fkey;
alter table public.tournaments
  add constraint tournaments_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournaments_status_check'
      and conrelid = 'public.tournaments'::regclass
  ) then
    alter table public.tournaments
      add constraint tournaments_status_check
      check (status in ('draft', 'open', 'closed'));
  end if;
end $$;

create or replace function public.is_organizer()
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
      and p.role = 'organizer'
  );
end;
$$;

drop policy if exists "tournaments_select_public" on public.tournaments;
create policy "tournaments_select_public"
on public.tournaments
for select
using (status in ('open', 'closed'));

drop policy if exists "tournaments_select_organizer" on public.tournaments;
create policy "tournaments_select_organizer"
on public.tournaments
for select
using (public.is_organizer() and created_by = auth.uid());

drop policy if exists "tournaments_insert_organizer" on public.tournaments;
create policy "tournaments_insert_organizer"
on public.tournaments
for insert
with check (public.is_organizer() and created_by = auth.uid());
