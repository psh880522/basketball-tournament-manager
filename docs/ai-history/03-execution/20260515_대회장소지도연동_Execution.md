# 대회 장소 지도 연동 실행 결과

참고 문서:
- 계획: `docs/ai-history/02-plans/20260515_대회장소지도연동_Plan_v1.md`
- UI 명세: `docs/ai-history/04-ui-spec/20260515_대회장소지도연동_ui_spec.md`
- 리서치: `docs/ai-history/01-research/20260515_대회장소지도연동_Research.md`

실행일: 2026-05-15

---

## 결과 요약

계획서(Plan_v1)에 명시된 모든 Phase를 완료. 타입 체크 및 프로덕션 빌드 통과.

---

## Phase별 실행 내역

### Phase 1 [완료] — DB 스키마 / 마이그레이션

**생성 파일**: `supabase/migrations/0256_tournaments_location_coords.sql`

```sql
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS location_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS location_lng double precision NULL;
```

Supabase MCP `apply_migration`으로 프로덕션 DB에 즉시 적용 완료.

---

### Phase 2 [완료] — 타입 정의

**신규 파일**: `lib/types/kakao.ts`
- `KakaoLocalPlace`: `place_name`, `address_name`, `road_address_name`, `x`(경도), `y`(위도), `place_url`
- `KakaoLocalSearchResponse`: `documents`, `meta`

**수정 파일**: `lib/api/tournaments.ts`
- `TournamentEditRow`, `PublicTournamentRow`, `TournamentUpdatePayload`에 `location_lat: number | null`, `location_lng: number | null` 추가
- `getTournamentForEdit()` SELECT: `location_lat,location_lng` 추가
- `getPublicTournamentById()` SELECT: `location_lat,location_lng` 추가
- `getOpenTournaments()` SELECT: `location_lat,location_lng` 추가 (타입 체크 중 발견)
- `getInProgressTournaments()` SELECT: `location_lat,location_lng` 추가 (타입 체크 중 발견)
- `getMyParticipatedTournaments()` 중첩 SELECT 및 수동 row 생성: `location_lat`, `location_lng` 추가 (타입 체크 중 발견)
- `updateTournament()` UPDATE 페이로드: `location_lat`, `location_lng` 추가

> **계획 대비 추가 수정**: 계획서에 명시된 2개 SELECT 외에 `getOpenTournaments`, `getInProgressTournaments`, `getMyParticipatedTournaments`도 `PublicTournamentRow`를 반환하므로 타입 체크 시 오류 발생 → 동일 패턴으로 수정.

---

### Phase 3 [완료] — 서버 액션 / API

**신규 파일**: `app/api/kakao-place-search/route.ts`
- GET Route Handler — Kakao Local 키워드 검색 서버 프록시
- `KAKAO_LOCAL_REST_API_KEY` 서버 전용 (NEXT_PUBLIC_ 없음)
- 쿼리 파라미터 `q` 검증, 결과 5개 반환

**수정 파일**: `app/(app)/admin/tournaments/[id]/edit/actions.ts`
- `UpdateTournamentInput` 타입에 `location_lat`, `location_lng` 추가
- `updateTournamentAction()`에서 `updateTournament()` 호출 시 좌표 전달

**수정 파일**: `app/(app)/admin/tournaments/new/actions.ts`
- FormData에서 `location_lat`, `location_lng` 파싱 (NaN → null 보호)
- `tournaments` INSERT 페이로드에 좌표 포함

**수정 파일**: `.env.local`
- `KAKAO_LOCAL_REST_API_KEY=""` 추가 (실제 키 등록 필요)

---

### Phase 4 [완료] — 프론트엔드

**신규 파일**: `components/location/LocationAutocomplete.tsx`
- `"use client"` 컴포넌트
- 디바운스 300ms (`useRef<ReturnType<typeof setTimeout>>`)
- click-out 감지 (`containerRef` + `mousedown` 이벤트 — DayPicker 패턴 재사용)
- 키보드 접근성: ArrowDown/Up, Enter, Escape, Tab
- 드롭다운 상태: 로딩 / 에러 / 결과 없음 / 결과 목록
- 힌트 텍스트: 좌표 있으면 emerald-600, 없으면 slate-400

**수정 파일**: `app/(app)/admin/tournaments/[id]/edit/tabs/BasicInfoTab.tsx`
- `locationLat`, `locationLng` 상태 추가 (초기값: `tournament.location_lat ?? null`)
- `<input>` → `<LocationAutocomplete>` 교체
- `handleSubmit`에 `location_lat`, `location_lng` 전달

**수정 파일**: `app/(app)/admin/tournaments/new/Form.tsx`
- `locationLat`, `locationLng` 독립 상태 추가 (FormState 미확장, 독립 useState 사용)
- `<input>` → `<LocationAutocomplete>` 교체
- `handleSubmit`의 FormData에 `location_lat`, `location_lng` 추가

> **계획 대비 차이**: 계획서는 `FormState` 타입 확장을 명시했으나, 실제 구현에서는 `locationLat`/`locationLng`를 독립 `useState`로 관리. `handleChange`가 `string` 값만 처리하는 구조여서 `number | null`을 FormState에 넣으면 타입 불일치 발생. 독립 상태가 더 안전하고 단순하여 이 방식으로 진행.

**수정 파일**: `app/(app)/tournament/[id]/_components/TournamentStickyPanel.tsx`
- `ExternalLink` import 추가 (lucide-react)
- 장소 행 구조 변경: `<dd>` + 조건부 링크 블록
- 네이버 지도 링크: `tournament.location` 있을 때 항상 표시 (API 키 불필요)
- 카카오맵 링크: `location_lat`, `location_lng` 모두 non-null일 때만 표시

---

### Phase 5 [완료] — RLS 확인

추가 RLS 정책 없음 — 계획서 명시대로 기존 정책 자동 상속 확인.

---

## 빌드 / 타입 체크 결과

```
npx tsc --noEmit   → 에러 0개
npx next build     → 성공 (프로덕션 빌드 정상)
```

---

## 환경변수 설정 필요 사항

Kakao Local API 키를 발급받아 아래 위치에 등록 필요:

| 위치 | 키 이름 |
|------|---------|
| `.env.local` (로컬) | `KAKAO_LOCAL_REST_API_KEY` |
| Vercel 프로젝트 환경변수 | `KAKAO_LOCAL_REST_API_KEY` |

Kakao 개발자 콘솔(developers.kakao.com) → 앱 설정 → 플랫폼 → Web에서 허용 도메인 등록:
- `http://localhost:3000`
- 프로덕션 도메인

REST API 키는 `KakaoAK` 접두사로 사용됨 (`Authorization: KakaoAK {key}`).

---

## 주요 구현 포인트

1. **Kakao x/y 좌표 순서**: `x`=경도(lng), `y`=위도(lat) — 모든 `onSelect` 콜백에서 `parseFloat(place.y)` → lat, `parseFloat(place.x)` → lng 적용
2. **API 키 보호**: `KAKAO_LOCAL_REST_API_KEY`는 서버 Route Handler에서만 참조
3. **하위 호환성**: 기존 대회는 좌표 NULL → 카카오맵 링크 숨김, 네이버 지도 링크는 location 텍스트로 즉시 표시
