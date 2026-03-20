do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'matches_round_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      drop constraint matches_round_check;
  end if;
end $$;

do $$
begin
  alter table public.matches
    add constraint matches_round_check
    check (round is null or round in ('round_of_16', 'quarterfinal', 'semifinal', 'final', 'third_place'));
end $$;
