do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'matches_division_round_created_at'
  ) then
    create index matches_division_round_created_at
      on public.matches (division_id, round, created_at)
      where group_id is null;
  end if;
end $$;
