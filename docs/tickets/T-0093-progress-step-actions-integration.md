# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]` 운영 화면에서 “운영 액션 섹션”을 제거한다
- 대신 Step Progress의 각 단계 카드에 해당 단계의 대표 액션 버튼(최대 2개)을 넣는다
- 버튼은 Guard 조건에 따라 활성/비활성되며, 비활성 시 이유를 표시한다
- 기능은 새로 만들지 않고 “기존 페이지 이동/기존 server action”을 연결한다 (minimal diff)

---

## 설계 원칙(고정)
- 각 단계 카드 버튼은 최대 2개
  - Primary 1개
  - Secondary 0~1개
- 가능한 경우:
  - “즉시 실행 가능한 작업”은 server action 호출
  - 그 외는 해당 기능 페이지로 이동(link)
- Guard로 막히는 버튼은 disabled + 이유 텍스트를 반드시 표시

---

## 대상 화면
- `/app/admin/tournaments/[id]/page.tsx`
- 기존 Progress Indicator/Step UI(T-0087에서 개선된 것)에 액션 연결

---

## 단계별 액션 매핑(고정, 최대 2개)

### 1) 팀 승인
- Primary: “신청 관리” → `/admin/tournaments/[id]/applications`
- Secondary: “모집 상태 변경” → (T-0086 Quick Status UI/액션 재사용)
  - (단, status 변경 UI가 이미 다른 위치에 있다면 단계 카드로 이동)

Guard(비활성 이유 예):
- 신청 관리: 항상 가능
- 모집 상태 변경: finished면 비활성 (“종료된 대회는 변경 불가”)

---

### 2) 조/경기 생성
- Primary: “조/경기 생성” → 기존 기능 페이지로 이동 (프로젝트 내 경로 사용)
- Secondary: “승인 팀 보기” → `/admin/tournaments/[id]/applications?status=approved` (가능하면)

Guard(비활성 이유 예):
- 승인 팀 2팀 이상 필요
- 모집 상태가 draft이면 비활성(선택)

---

### 3) 코트 배정
- Primary: “코트 설정” → 기존 court 관리 페이지
- Secondary: “코트 배정” → 기존 match court assignment 페이지

Guard(비활성 이유 예):
- 경기(total_matches_count) > 0 필요
- finished면 비활성

---

### 4) 경기 결과 입력
- Primary: “결과 입력” → 기존 match result input 페이지
- Secondary: “현황 보기” → `/dashboard` 또는 기존 운영 현황 페이지

Guard(비활성 이유 예):
- 경기(total_matches_count) > 0 필요
- finished면 비활성

---

### 5) 순위 확정
- Primary: “순위 계산/확정” → 기존 standings 계산/확정 기능(페이지 또는 action)
- Secondary: “순위 보기” → standings view 페이지

Guard(비활성 이유 예):
- 완료 경기 수 == 전체 경기 수 필요(정교화는 제외, 단순 조건)
- finished면 비활성

---

### 6) 토너먼트 생성
- Primary: “토너먼트 생성” → 기존 generate bracket 페이지 또는 action
- Secondary: “브라켓 보기” → bracket view 페이지

Guard(비활성 이유 예):
- standings 존재/확정 필요(가능하면)
- approved teams >= 2 필요
- finished면 비활성

---

### 7) 종료
- Primary: “대회 종료” → finishTournament action(T-0077)
- Secondary: “결과 보기” → `/tournament/[id]/result`

Guard(비활성 이유 예):
- finished면 비활성 (“이미 종료됨”)
- (선택) 미완료 경기 존재 시 비활성 또는 경고 (정책은 기존 T-0077을 따른다)

---

## Guard 연동(필수)
- 이미 존재하는 Guard helper(T-0076, T-0087 진행 상태 계산)를 재사용한다.
- 각 액션마다 다음을 제공:
  - `enabled: boolean`
  - `reason?: string` (enabled=false일 때)

> Guard의 정밀도는 Level 1 수준으로 충분.
> 중요한 것은 “비활성 + 이유 표시” UX.

---

## UI 요구사항(필수)
- 각 단계 카드에:
  - 단계명
  - 상태(done/active/pending)
  - (선택) 요약 설명 1줄
  - Primary 버튼
  - Secondary 버튼(있으면)
- disabled 버튼 스타일 명확히(hover 없음, opacity)
- 비활성 이유 텍스트를 버튼 아래 또는 툴팁 형태로 표시(텍스트 추천)

---

## 에러 처리 규칙
- server action 호출(예: 종료)은:
  - 로딩 상태
  - 실패 시 에러 메시지 UI
  - 성공 시 상태 갱신(revalidate)

- 링크 이동형 버튼은:
  - disabled일 때 이동 불가

---

## 권한
- organizer 전용 화면 (기존 정책 유지)

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/page.tsx`
- `/app/admin/tournaments/[id]/ProgressIndicator.tsx` (또는 Step 컴포넌트)
- `/lib/api/tournamentProgress.ts` (또는 기존 진행/가드 헬퍼)
- `/app/admin/actions.ts` (finish/status change가 여기 있다면 재사용)
- (필요 시) `/components/ui/Button.tsx` (disabled 스타일/variant 보강 수준)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 새 기능 페이지 생성
- 액션 자동 실행(조 생성 자동화 등)
- Guard 정교화(Level 2+)
- 실시간 현황판 고도화

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] 운영 화면에서 기존 “운영 액션 섹션”이 제거되거나 사실상 불필요해진다
- [ ] 7개 단계 카드에 단계별 버튼(최대 2개)이 노출된다
- [ ] Guard 조건에 따라 버튼이 활성/비활성된다
- [ ] 비활성 버튼에는 이유가 표시된다
- [ ] 종료 action은 로딩/에러/성공 처리가 된다
- [ ] 기능 로직 변경 없이 기존 페이지/액션으로 연결된다