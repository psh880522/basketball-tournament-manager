# 참가팀 출석 체크 구현 실행 결과

실행 기준 문서: `docs/ai-history/02-plans/20260514_참가팀출석체크_Plan_v1.md`

---

## 완료 요약

```
구현 완료: 20260514_참가팀출석체크
- 완료된 Phase: 5개
- 신규 파일: 6개
- 수정 파일: 4개
- 빌드: 성공
- 특이사항: 아래 참고
```

---

## Phase별 완료 내역

### Phase 1 [완료] — DB 스키마 / 마이그레이션 + RLS

- `supabase/migrations/0255_team_attendance.sql` 생성
- `team_attendance` 테이블 (tournament_id + team_id PK, attended boolean, checked_by, checked_at)
- `idx_team_attendance_tournament` 인덱스
- RLS 4개 정책 (select/insert/update/delete — organizer 전용)
- Supabase MCP tool로 원격 적용 완료

### Phase 2+3 [완료] — 타입 정의 + API + 서버 액션

- `lib/api/attendance.ts` 생성
  - `AttendanceRow` 타입
  - `getTeamsWithAttendance()` — 4단계 쿼리 + 메모리 병합
  - `toggleTeamAttendance()` — upsert with onConflict
- `app/(app)/admin/tournaments/[id]/attendance/actions.ts` 생성
  - `toggleAttendanceAction()` — organizer 권한 확인 + revalidatePath
- `app/api/admin/tournaments/[id]/attendance/export/route.ts` 생성
  - GET 핸들러 — xlsx Buffer 생성 + Content-Disposition 응답

### Phase 4 [완료] — 프론트엔드

- `app/(app)/admin/tournaments/[id]/attendance/page.tsx` 생성
  - 서버 컴포넌트, organizer 권한 가드
  - `Promise.all` 로 teams + tournament 병렬 fetch
  - `isFinished` prop AttendanceTable 전달
- `app/(app)/admin/tournaments/[id]/attendance/AttendanceTable.tsx` 생성
  - 클라이언트 컴포넌트
  - KPI 카드 3개 (전체/출석/미확인)
  - `useTransition` + optimistic update
  - 체크박스 토글 실패 시 롤백 + 1.5초 에러 메시지
  - Excel 내보내기 `<a download>` 링크
  - "결과 입력으로 이동" 버튼

### Phase 5 [완료] — 대시보드 통합

- `lib/api/tournamentProgress.ts` 수정
  - `TournamentProgressState`에 `"ATTENDANCE_CHECK"` 추가
  - `resolveState()`: `return "RESULT"` → `return "ATTENDANCE_CHECK"`
  - `resolveNextAction()`: `ATTENDANCE_CHECK` 분기 추가
- `app/(app)/admin/tournaments/[id]/page.tsx` 수정
  - `buildSteps()`에 "출석 체크" 스텝 (index 3) 삽입
  - primary: 출석 체크 페이지 이동 (스케줄 완료 조건)
  - secondary: 결과 입력 직접 이동 (우회 경로 유지)
- `app/(app)/admin/tournaments/[id]/StepDescriptions.ts` 수정
  - `"출석 체크": "경기 시작 전 팀 현장 출석을 확인합니다."` 추가

---

## 특이사항

1. **pnpm 환경**: `npm install xlsx` 실패 (pnpm-lock.yaml 존재). `pnpm add xlsx`로 해결. (xlsx 0.18.5 설치됨)

2. **`getUserWithRole` status 타입**: 계획서 의사코드에서 `"ok"` 로 기술했으나 실제 타입은 `"ready"`. `actions.ts` 작성 후 타입 체크에서 발견, 즉시 수정.

3. **그룹 쿼리 필터**: `group_teams` join 시 `.eq("groups.type", "league")` 사용. Supabase SDK에서 join 필터는 `!inner` 키워드 없이는 필터가 적용되지 않을 수 있어 `groups!inner` 로 지정.

---

## 신규 생성 파일 목록

| 파일 경로 |
|-----------|
| `supabase/migrations/0255_team_attendance.sql` |
| `lib/api/attendance.ts` |
| `app/(app)/admin/tournaments/[id]/attendance/page.tsx` |
| `app/(app)/admin/tournaments/[id]/attendance/AttendanceTable.tsx` |
| `app/(app)/admin/tournaments/[id]/attendance/actions.ts` |
| `app/api/admin/tournaments/[id]/attendance/export/route.ts` |

## 수정 파일 목록

| 파일 경로 | 수정 내용 |
|-----------|----------|
| `lib/api/tournamentProgress.ts` | ATTENDANCE_CHECK 상태 추가, resolveState/resolveNextAction 수정 |
| `app/(app)/admin/tournaments/[id]/page.tsx` | buildSteps()에 출석 체크 스텝 삽입 |
| `app/(app)/admin/tournaments/[id]/StepDescriptions.ts` | 출석 체크 설명 추가 |
| `package.json` + `pnpm-lock.yaml` | xlsx 0.18.5 추가 |
