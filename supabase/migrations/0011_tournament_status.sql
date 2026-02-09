create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  start_date date,
  end_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'status'
  ) then
    alter table public.tournaments
      add column status text not null default 'draft';
  end if;
end $$;

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

drop policy if exists "tournaments_update_organizer" on public.tournaments;
create policy "tournaments_update_organizer"
on public.tournaments
for update
using (public.is_organizer())
with check (public.is_organizer());
