do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'matches_division_round_unique'
  ) then
    drop index public.matches_division_round_unique;
  end if;
end $$;
