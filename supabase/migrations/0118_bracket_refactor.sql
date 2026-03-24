-- 1) groups 테이블에 type 컬럼 추가
alter table public.groups
  add column if not exists type text not null default 'league';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'groups_type_check'
  ) then
    alter table public.groups
      add constraint groups_type_check
      check (type in ('league', 'tournament'));
  end if;
end $$;

-- 2) matches 테이블에 seed 컬럼 추가
alter table public.matches
  add column if not exists seed_a integer,
  add column if not exists seed_b integer;

-- 3) round 컬럼 관련 제약 제거
alter table public.matches
  drop constraint if exists matches_round_check;

alter table public.matches
  drop constraint if exists matches_round_group_check;

-- 4) round 컬럼 삭제
alter table public.matches
  drop column if exists round;

-- 5) matches UPDATE RLS: seed 업데이트 허용 (organizer)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'matches' and policyname = 'matches_update_organizer'
  ) then
    create policy "matches_update_organizer"
      on public.matches
      for update
      using (public.is_organizer())
      with check (public.is_organizer());
  end if;
end $$;
