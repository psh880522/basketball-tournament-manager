# Vertical Slice Ticket

## 목표
- “팀(teams)”을 대회와 분리된 독립 엔티티로 운용할 수 있는 기반을 만든다
- 팀 단위 역할(=team_manager/player)을 글로벌 role이 아닌 **멤버십(team_members)** 기반으로 전환할 수 있게 한다
- 대회 참가 신청을 join 테이블(**tournament_team_applications**)로 분리한다
- RLS로 다음을 강제한다:
  - organizer: 대회 신청 전체 조회/승인 가능
  - team manager: 자기 팀 생성/수정/선수 관리/신청 생성 가능
  - public/team_manager: 삭제/승인은 불가

---

## DB (필수: Supabase MCP 사용)

### 1) teams (독립 팀)
이미 teams 테이블이 존재한다면:
- 이번 티켓에서는 기존 컬럼/데이터를 최대한 유지하고,
- 필요한 컬럼이 없다면 **추가**만 한다 (기존 기능 깨지지 않게)

필수 컬럼(없으면 추가):
- `created_by uuid not null` (auth.users.id)
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

> 기존 teams에 `tournament_id`가 있더라도 삭제하지 말 것(점진 전환).
> 새 흐름에서는 tournament_id 의존을 제거한다.

---

### 2) team_members (신규)
테이블 생성:
- `team_id uuid not null references teams(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role_in_team text not null check (role_in_team in ('manager','player'))`
- `created_at timestamptz not null default now()`
- unique(team_id, user_id)

---

### 3) tournament_team_applications (신규)
테이블 생성:
- `id uuid primary key default gen_random_uuid()`
- `tournament_id uuid not null references tournaments(id) on delete cascade`
- `team_id uuid not null references teams(id) on delete cascade`
- `status text not null default 'pending'
   check (status in ('pending','approved','rejected'))`
- `applied_by uuid not null references auth.users(id) on delete restrict`
- `created_at timestamptz not null default now()`
- unique(tournament_id, team_id)

인덱스(권장):
- (tournament_id)
- (team_id)
- (tournament_id, status)

---

## RLS 정책 (필수: Supabase MCP로 생성/검증)

### 공통 전제
- organizer 판정은 기존 프로젝트의 role 시스템을 따른다
  - (예: profiles.role = 'organizer' 등)
- team manager 판정:
  - exists (select 1 from team_members
            where team_id = 대상 team_id
              and user_id = auth.uid()
              and role_in_team='manager')

### teams
- SELECT:
  - 로그인 유저는 자신이 속한 팀(팀 멤버)만 조회 가능 (기본)
  - organizer는 전체 조회 가능 (선택; admin 기능에 필요하면 허용)
- INSERT:
  - 로그인 유저만 가능
  - created_by는 auth.uid()와 일치해야 함
- UPDATE/DELETE:
  - team manager만 가능
  - organizer는 허용(선택)

### team_members
- SELECT:
  - team member는 자신의 팀 멤버 목록 조회 가능
  - organizer는 전체 조회 가능(선택)
- INSERT/UPDATE/DELETE:
  - team manager만 가능
  - (이번 티켓에서는 “팀 생성 시 manager 자동 등록”을 위해
     INSERT 권한이 manager에게 필요하거나,
     server-side에서만 삽입하도록 정책 조정 필요)

> 구현상 안전한 방식:
> - team_members에 대한 INSERT는 server action만 쓰되,
> - RLS는 manager + created_by 기반으로 최소 허용

### tournament_team_applications
- SELECT:
  - organizer: 전체 조회 가능
  - team member: 자기 팀 신청만 조회 가능
- INSERT:
  - team manager만 가능
  - applied_by = auth.uid() 강제
- UPDATE (승인/거절):
  - organizer만 가능
- DELETE:
  - 금지(기본). 필요 시 별도 티켓.

---

## Supabase MCP 절차 (필수)
- MCP로 다음을 수행:
  1) 신규 테이블 생성(team_members, tournament_team_applications)
  2) teams 필수 컬럼 추가(필요 시)
  3) RLS enable + 정책 생성
  4) 마이그레이션 파일 생성/저장
  5) SQL 적용 후 MCP로 정책/권한 동작 확인

마이그레이션 파일명 예시:
- `supabase/migrations/0088_team_members_applications.sql`

---

## API/UI
- 이번 티켓에서는 UI 변경 없음
- (선택) 최소 smoke test용으로 SQL만으로 INSERT/SELECT 검증

---

## 수정 허용 범위 (필수)
- `supabase/migrations/*` (본 티켓 마이그레이션)
- (필요 시) `supabase/seed.sql` 또는 테스트용 SQL 스크립트 파일 1개 (선택)

그 외 앱 코드 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 팀 생성/대시보드 UI (다음 티켓)
- 선수 CRUD 연결 (다음 티켓)
- 참가 신청 UI (다음 티켓)
- 팀 멤버 초대/관리 UI
- 신청 취소/수정

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] team_members 테이블이 생성되고 RLS가 설정되어 있다
- [ ] tournament_team_applications 테이블이 생성되고 RLS가 설정되어 있다
- [ ] teams에 created_by/created_at/updated_at이 없다면 추가되어 있다
- [ ] organizer는 applications 전체 조회 및 status 업데이트가 가능하다
- [ ] team manager는 자기 팀으로 applications INSERT가 가능하다
- [ ] team member는 자기 팀 applications SELECT가 가능하다
- [ ] public/비권한 유저는 위 쓰기 작업이 차단된다
- [ ] 모든 변경은 Supabase MCP로 수행되고 마이그레이션이 저장되어 있다