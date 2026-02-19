# Vertical Slice Ticket

## 목표

- 운영자 대시보드에서 대회 진행 단계를 시각적으로 표시한다
- 현재 단계가 무엇인지 한눈에 알 수 있다
- 완료/진행중/대기 상태가 명확히 구분된다
- T-0074에서 계산한 Progress State를 기반으로 동작한다

---

## 범위 요약 (중요)

- 이번 슬라이스는 **UI 컴포넌트 구현이 핵심**
- 상태 계산 로직은 T-0074 helper를 재사용한다
- 단계 클릭 이동 기능은 포함하지 않는다
- DB에 상태를 저장하지 않는다

---

## 진행 단계 (고정)

1. 팀 승인
2. 조/경기 생성
3. 조별 리그 진행
4. 순위 계산
5. 토너먼트 생성
6. 토너먼트 진행/종료

내부 키는 상수로 관리한다.

---

## 상태 매핑 규칙

T-0074의 `state` 값을 기반으로 다음처럼 매핑한다:

TEAM_APPROVAL  
→ [1] active / [2~6] pending

GROUP_STAGE_GENERATED  
→ [1] done / [2] active / [3~6] pending

MATCH_IN_PROGRESS  
→ [1] done / [2] done / [3] active / [4~6] pending

STANDINGS_READY  
→ [1] done / [2] done / [3] done / [4] active / [5~6] pending

BRACKET_READY  
→ [1~4] done / [5] active / [6] pending

TOURNAMENT_FINISHED  
→ [1~6] done

상태 값:
- done
- active
- pending

---

## UI

### 경로
`/app/admin/tournaments/[id]/ProgressIndicator.tsx`

### 요구사항
- 6단계가 가로 또는 세로로 표시된다
- 현재(active) 단계는 강조 표시
- done/active/pending은 텍스트로도 구분
- 모바일에서도 깨지지 않는다

---

## 권한

- organizer만 접근 가능
- 기존 관리자 접근 정책 유지

---

## 수정 허용 범위 (필수)

- `/app/admin/tournaments/[id]/ProgressIndicator.tsx`
- `/app/admin/tournaments/[id]/page.tsx`
- `/lib/api/tournamentProgress.ts` (타입/상수 정리 수준)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 단계 클릭 이동
- 자동 상태 전환
- DB에 progress 저장
- 알림 기능

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] 6단계가 정확히 표시된다
- [ ] state 값에 따라 done/active/pending이 정확히 매핑된다
- [ ] 색상 없이도 상태 구분 가능하다
- [ ] 모바일에서도 정상 표시된다
