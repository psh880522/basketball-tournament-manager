# Vertical Slice Ticket

## 목표
- divisions 테이블을 추가한다
- tournament_team_applications에 division_id를 추가한다
- 한 팀은 한 대회에 하나의 division만 신청 가능하도록 제약을 둔다
- RLS를 통해:
  - organizer만 divisions CRUD 가능
  - public은 divisions SELECT 가능
  - applications INSERT 시 division_id가 해당 tournament 소속인지 검증

---

## DB (필수: Supabase MCP 사용)

### 1) divisions 테이블 생성

create table divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

index:
- (tournament_id)
- (tournament_id, sort_order)

---

### 2) applications에 division_id 추가

alter table tournament_team_applications
add column division_id uuid not null
references divisions(id) on delete restrict;

---

### 3) unique 제약 유지
unique(tournament_id, team_id)

→ 팀은 한 대회에 하나의 division만 신청 가능

---

## RLS 정책

### divisions
- SELECT: public 허용
- INSERT/UPDATE/DELETE: organizer만

### tournament_team_applications
- INSERT 조건:
  - team manager
  - division_id가 해당 tournament_id에 속해야 함
    (server action에서 검증 필수)

---

## Supabase MCP 절차 (필수)
1) divisions 테이블 생성
2) applications 테이블에 division_id 추가
3) RLS enable + 정책 생성
4) migration 파일 생성
   예: supabase/migrations/0094_divisions.sql
5) SQL 적용 후 정책 테스트

---

## API/UI
- 이번 티켓에서는 UI 변경 없음
- 단, division_id가 not null이므로
  - 기존 apply 로직은 다음 티켓에서 수정 필요

---

## 수정 허용 범위
- supabase/migrations/*
- (필요 시) seed.sql

앱 코드 수정 금지

---

## 제외 범위
- divisions 관리 UI
- apply 페이지 수정
- 승인 화면 수정
- 경기 생성 로직 변경

---

## 완료 기준 (Definition of Done)
- [ ] divisions 테이블이 생성되었다
- [ ] applications에 division_id가 추가되었다
- [ ] unique(tournament_id, team_id) 유지된다
- [ ] organizer만 divisions 수정 가능하다
- [ ] public은 divisions 조회 가능하다
- [ ] 마이그레이션이 MCP로 생성/저장되었다