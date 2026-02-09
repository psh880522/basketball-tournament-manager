# Vertical Slice Ticket

## 목표
- 로그인 사용자는 `profiles` 테이블에 1:1 프로필을 가진다
- 사용자 역할(Role)을 서버 기준으로 관리한다
  - organizer
  - team_manager
  - player
  - spectator
- 기본 역할은 `spectator`
- 역할에 따라 페이지 접근을 서버에서 제한한다

## DB
- profiles table 생성
  - auth.users 와 1:1 관계
- user 생성 시 profiles 자동 생성 트리거
- RLS 정책 적용
  - 본인 프로필만 select/update 가능
  - organizer는 profiles 전체 select 가능
  - 일반 insert/delete 금지(트리거로만 생성)

## API
- (직접 노출 API 없음)
- 서버 내부 로직에서만 사용
  - `auth.getUser()`
  - `profiles` role 조회
- 서버 헬퍼 함수:
  - `getUserWithRole()`

## UI
- `/admin`
  - organizer만 접근 가능
  - 접근 허용 시 "Admin Console" 텍스트 표시
- `/team`
  - organizer, team_manager만 접근 가능
  - 접근 허용 시 "Team Manager" 텍스트 표시
- `/dashboard`
  - 로그인 사용자 접근 가능
  - (선택) role 정보 텍스트 표시

## 권한
- organizer
  - `/admin` 접근 가능
  - `/team` 접근 가능
  - profiles 전체 select 가능
- team_manager
  - `/team` 접근 가능
  - 본인 profile만 접근 가능
- player / spectator
  - 제한 페이지 접근 불가
  - 본인 profile만 접근 가능

## 수정 허용 범위 (필수)

- `supabase/migrations/0002_profiles_roles.sql`
- `src/lib/auth/roles.ts`
- `src/lib/supabase/server.ts`
- `app/admin/page.tsx`
- `app/team/page.tsx`
- `app/dashboard/page.tsx` (role 표시 목적의 최소 수정만 허용)

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

## 제외 범위 (비어 있으면 skip)

- UI에서 role 변경 기능
- 관리자 관리 화면
- 팀/선수/대회 CRUD
- 결제
- realtime
- 대진표

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

## 완료 기준 (Definition of Done)

- [ ] 마이그레이션 적용 후 신규 가입 시 profiles row가 자동 생성된다
- [ ] 기본 role이 `spectator`로 설정된다
- [ ] 서버에서 로그인 사용자 role 조회가 가능하다
- [ ] organizer만 `/admin` 접근 가능하다
- [ ] organizer, team_manager만 `/team` 접근 가능하다
- [ ] 일반 사용자는 자신의 profile만 조회/수정 가능하다
- [ ] organizer는 profiles 전체 조회가 가능하다
- [ ] T-0001 Auth Login 슬라이스 동작에 영향이 없다
