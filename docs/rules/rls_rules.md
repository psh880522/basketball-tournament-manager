# RLS Rules

## MVP RLS 전략
- SELECT는 상대적으로 넓게, WRITE는 엄격하게 제한한다.
- 최소 권한 원칙을 유지한다.

## 재귀 금지 규칙
- 정책에서 동일 테이블을 직접 조회하지 않는다.
- 재귀가 필요한 경우 별도 뷰/함수로 분리한다.

## security definer + row_security off 패턴
- 복잡한 권한 검사는 SECURITY DEFINER 함수로 캡슐화한다.
- 내부 전용 함수에서만 row_security off를 사용한다.

## 흔한 오류 대응
- infinite recursion: 정책에서 동일 테이블 참조 여부 확인
- permission denied: 역할/정책 누락 여부 확인

## 잘못된 패턴
```sql
create policy "team_members_select" on team_members
for select using (
  exists (
    select 1 from team_members tm
    where tm.team_id = team_members.team_id
  )
);
```

## 올바른 패턴
```sql
create policy "team_members_select" on team_members
for select using (
  team_members.user_id = auth.uid()
  and team_members.role in ('owner','manager')
);
```

## 권장 템플릿 (재귀 방지)
```sql
create or replace function public.has_admin_role()
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

create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (
  id = auth.uid()
  or public.has_admin_role()
);
```
