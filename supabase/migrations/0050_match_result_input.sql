do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'score_a'
  ) then
    alter table public.matches add column score_a integer;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'score_b'
  ) then
    alter table public.matches add column score_b integer;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'winner_team_id'
  ) then
    alter table public.matches add column winner_team_id uuid;
  end if;
end $$;

alter table public.matches
  drop constraint if exists matches_winner_team_id_fkey;
alter table public.matches
  add constraint matches_winner_team_id_fkey
  foreign key (winner_team_id)
  references public.teams(id)
  on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_status_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_status_check
      check (status in ('scheduled', 'completed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_score_a_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_score_a_check
      check (score_a is null or score_a >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_score_b_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_score_b_check
      check (score_b is null or score_b >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_winner_team_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_winner_team_check
      check (
        winner_team_id is null
        or winner_team_id = team_a_id
        or winner_team_id = team_b_id
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_result_completion_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_result_completion_check
      check (
        (status = 'scheduled'
          and score_a is null
          and score_b is null
          and winner_team_id is null)
        or (status = 'completed'
          and score_a is not null
          and score_b is not null
          and winner_team_id is not null)
      );
  end if;
end $$;
