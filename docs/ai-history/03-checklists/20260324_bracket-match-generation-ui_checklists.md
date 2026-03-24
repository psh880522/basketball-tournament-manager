# 실행 체크리스트: bracket-match-generation-ui

## Step 1. DB 마이그레이션 작성 [완료]
- supabase/migrations/0118_bracket_refactor.sql 추가
- groups.type, matches.seed_a/seed_b, round 제거, RLS 업데이트

## Step 2. lib/api/matches.ts 수정 [완료]
- MatchRow/관련 타입 업데이트
- round 제거, seed 추가
- updateMatchSeeds 함수 추가

## Step 3. lib/api/bracket.ts 재작성 [완료]
- createTournamentMatches group 기반 생성
- getBracketGenerationSummary group.type 기반 분기
- summary 타입 변경

## Step 4. lib/api/results.ts 재작성 [완료]
- TournamentMatchRow/Progress 타입 수정
- listTournamentMatchesByDivision, saveTournamentResult, getTournamentBracketProgress 수정
- round 라벨 로직 group.name 기준 변경

## Step 5. lib/api/schedule-slots.ts 수정 [완료]
- ScheduleSlotMatch round 제거
- group order 기반 정렬 로직 변경
- tournament match 필터 변경

## Step 6. lib/formatters/matchLabel.ts 수정 [완료]
- round 파라미터 제거, groupName으로 변경

## Step 7. app/admin/.../bracket/actions.ts 수정 [완료]
- updateMatchSeedAction 추가

## Step 8. app/admin/.../bracket/page.tsx 수정 [완료]
- summary 재사용 전제 변경사항 반영

## Step 9. app/admin/.../bracket/Form.tsx 전면 개편 [완료]
- 토너먼트 크기 드롭다운 4/8/16
- 생성 결과 요약 섹션 제거
- seed 편집 테이블 추가

## Step 10. ResultForm.tsx 수정 [완료]
- round 참조 제거 및 group 기반 표시

## Step 11. 추가 영향 파일 점검 및 보완 [완료]
- schedule, matches, bracket/tournament 페이지 등 round 참조 업데이트

## Step 12. 타입 체크 [완료]
- pnpm tsc --noEmit
