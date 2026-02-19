# Vertical Slice Ticket

## 목표

- 팀 대표가 대회 참가 신청 후 “내 상태”를 명확히 알 수 있다
  - pending / approved / rejected
- 신청 후 사용자가 어디서 확인해야 하는지(동선)가 끊기지 않는다
- 대회 상세(`/tournament/[id]`) 또는 신청 페이지(`/tournament/[id]/apply`)에서
  현재 상태가 노출된다

---

## 범위 요약 (중요)

- 이번 슬라이스는 “상태 표시 UX”가 핵심이다
- 승인/거절 기능(T-0021)은 그대로 재사용한다
- DB 구조 변경은 없다 (teams.status를 사용)
- 알림/메일/푸시는 포함하지 않는다

---

## 전제 조건

- Team Apply(T-0020)로 팀 생성/신청이 가능하다
- Admin Approve Teams(T-0021)로 team.status를 pending/approved/rejected로 바꿀 수 있다
- Team View(T-0022) 또는 teams 조회 API가 존재한다

---

## 상태 정의 (고정)

- `pending`  : 승인 대기
- `approved` : 참가 확정
- `rejected` : 거절됨

표시 문구(한국어):
- pending  → “승인 대기 중”
- approved → “참가 확정”
- rejected → “참가 거절됨”

---

## 표시 위치 (둘 중 1개는 반드시)

### 옵션 A (추천): `/tournament/[id]`에서 상태 표시
- 로그인한 사용자가 해당 tournament에 신청한 팀이 있으면
  - 상태 배지 + 안내 문구 표시
  - open 상태여도 “이미 신청함”으로 CTA가 바뀐다

CTA 분기:
- 신청 기록 없음 + open → “팀 참가 신청”
- 신청 기록 있음:
  - pending  → 버튼 비활성화 + “승인 대기 중”
  - approved → “내 팀 보기”(`/team` 또는 해당 팀 상세)
  - rejected → “거절됨” 안내 + (재신청은 이번 범위 제외)

### 옵션 B: `/tournament/[id]/apply` 제출 후 결과 화면 제공
- 신청 완료 후 같은 페이지에서 상태를 보여주고
- “내 팀 보기” 링크 제공

> 구현 복잡도/동선 관점에서 A가 더 좋고, B는 보조로만 사용.

---

## 데이터 조회

필요 데이터:
- 현재 로그인 사용자 id
- tournamentId
- teams에서:
  - tournament_id = tournamentId
  - captain_user_id = current user id
  - (또는 membership 구조가 있다면 그 기준)

반환값:
- 없으면 null
- 있으면 { team_id, team_name, status }

---

## UI 상태 처리

- 로딩 상태
- 에러 메시지
- 신청 팀 없음 상태(= 신청 가능 상태)
- rejected 상태 안내(재신청/문의는 제외)

---

## 권한

- team_manager(로그인 유저 본인)만 “내 신청 상태”를 볼 수 있으면 충분
- 공개 사용자에게는 신청 상태 노출 금지

---

## 수정 허용 범위 (필수)

- `/app/tournament/[id]/page.tsx` (상태 표시/CTA 분기)
- `/lib/api/teams.ts` (내 신청 팀 조회 helper 추가 수준)
- (선택) `/app/tournament/[id]/apply/page.tsx` (신청 완료 후 안내)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 재신청 기능
- 신청 취소
- 팀 대표 변경
- 알림(메일/푸시)
- 운영자 메시지/사유 노출

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] 로그인 유저가 신청한 팀이 있으면 상태가 표시된다
- [ ] pending/approved/rejected 상태별 문구가 정확하다
- [ ] 상태에 따라 CTA가 올바르게 분기된다
- [ ] 신청한 팀이 없으면 신청 버튼이 보인다(open 상태에서)
- [ ] 로딩/에러/빈 상태 UI가 있다
