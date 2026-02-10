do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'round'
  ) then
    alter table public.matches add column round text;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_round_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_round_check
      check (round is null or round in ('quarterfinal', 'semifinal', 'final'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_round_group_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_round_group_check
      check (
        (group_id is null and round is not null)
        or (group_id is not null and round is null)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'matches_division_round_unique'
  ) then
    create unique index matches_division_round_unique
      on public.matches (division_id, round)
      where group_id is null;
  end if;
end $$;
