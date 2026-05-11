# 인증 가드 하이브리드 미들웨어 구현 결과

> 플랜 문서: `docs/ai-history/02-plans/20260421_인증가드_하이브리드미들웨어_Plan_v1.md`
> 실행 일자: 2026-04-21

---

## 구현 결과 요약

```
구현 완료: 20260421_인증가드_하이브리드미들웨어
- 완료된 Phase: 1개 (Phase 4 — 프론트엔드)
- 신규 파일: 0개 (middleware.ts 생성 후 삭제)
- 수정 파일: 25개
- 빌드: 성공
- 특이사항: proxy.ts 존재로 middleware.ts 대신 proxy.ts에 로직 통합
```

---

## Phase 완료 현황

- [완료] Phase 1 — DB 스키마 / 마이그레이션 (해당 없음)
- [완료] Phase 2 — 타입 정의 (해당 없음)
- [완료] Phase 3 — 서버 액션 / API (해당 없음)
- [완료] Phase 4 — 프론트엔드
  - [완료] Phase 4-1: 인증 가드 미들웨어 (proxy.ts 수정)
  - [완료] Phase 4-2: app/(auth) 페이지 정리 (2개)
  - [완료] Phase 4-3: app/(app) 보호 페이지 정리 (21개 + team/page.tsx)
- [완료] Phase 5 — 권한 정책 RLS (해당 없음)

---

## 특이사항: proxy.ts vs middleware.ts

### 발견된 문제

계획서는 `middleware.ts`를 신규 생성하는 것으로 기술되어 있었으나, 프로젝트 루트에 이미 `proxy.ts` 파일이 존재했음. Next.js는 `middleware.ts`와 `proxy.ts`를 동시에 허용하지 않으며, 빌드 시 다음 오류 발생:

```
Error: Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected.
Please use "./proxy.ts" only.
```

### 해결 방법

- `middleware.ts` 생성 후 즉시 삭제
- 기존 `proxy.ts`에 계획서의 인증 가드 로직을 통합

### proxy.ts 기존 역할

- Supabase 세션 쿠키 갱신 처리
- `refresh_token_already_used` 에러 시 자동 로그아웃

### proxy.ts 추가된 역할

- `AUTH_PATHS` (`/login`, `/signup`): 이미 로그인된 사용자 접근 시 `/dashboard` 리다이렉트
- `isProtectedPath()`: 보호 경로에서 세션 없으면 `/login?next={경로}` 리다이렉트

---

## 수정된 파일 목록

### proxy.ts (인증 가드 로직 통합)

| 추가 내용 | 설명 |
|----------|------|
| `AUTH_PATHS` 상수 | `/login`, `/signup` |
| `isProtectedPath()` 함수 | `/admin/*`, `/dashboard`, `/team*`, `/my-applications/*`, `/onboarding/*`, `/tournament/:id/apply` |
| 로그인 사용자 AUTH 경로 리다이렉트 | `/dashboard`로 이동 |
| 미인증 사용자 보호 경로 리다이렉트 | `/login?next={경로}`로 이동 |

### app/(auth) — 2개

| 파일 | 변경 내용 |
|------|----------|
| `app/(auth)/login/page.tsx` | `getUserWithRole()` 호출 및 관련 import(`redirect`, `getUserWithRole`, `isOperationRole`, `isPlayerRole`) 제거 |
| `app/(auth)/signup/page.tsx` | `getUserWithRole()` 호출 및 관련 import(`redirect`, `getUserWithRole`, `isOperationRole`) 제거 |

### app/(app) — 23개

| 파일 | 변경 내용 |
|------|----------|
| `app/(app)/dashboard/page.tsx` | `status === "unauthenticated"` redirect 제거 |
| `app/(app)/admin/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/applications/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/bracket/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/edit/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/matches/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/result/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/schedule/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/[id]/standings/page.tsx` | 동일 |
| `app/(app)/admin/tournaments/new/page.tsx` | 동일 |
| `app/(app)/admin/users/page.tsx` | 동일 |
| `app/(app)/teams/page.tsx` | `"unauthenticated" \|\| "empty"` → `"empty"` only |
| `app/(app)/teams/new/page.tsx` | 동일 |
| `app/(app)/teams/find/page.tsx` | 동일 |
| `app/(app)/teams/[teamId]/page.tsx` | `unauthenticated` redirect 제거 + unused `redirect` import 제거 |
| `app/(app)/teams/[teamId]/applications/page.tsx` | `"unauthenticated" \|\| "empty"` → `"empty"` only |
| `app/(app)/my-applications/page.tsx` | `"unauthenticated" \|\| "empty"` → `"empty"` only |
| `app/(app)/my-applications/[applicationId]/page.tsx` | 동일 |
| `app/(app)/onboarding/profile/page.tsx` | `unauthenticated` redirect 제거 (`empty` redirect 유지) |
| `app/(app)/onboarding/identity/page.tsx` | 동일 |
| `app/(app)/onboarding/team-choice/page.tsx` | `"unauthenticated" \|\| "empty"` → `"empty"` only |
| `app/(app)/onboarding/completion/page.tsx` | 동일 |
| `app/(app)/team/page.tsx` | `unauthenticated` redirect 제거 |

---

## 최종 인증 흐름

```
HTTP 요청
    │
    ▼
proxy.ts (Middleware — 전체 경로)
    ├─ 세션 쿠키 갱신 (auth.getUser())
    ├─ refresh_token_already_used → signOut()
    ├─ /login, /signup + 로그인 사용자 → redirect("/dashboard")
    ├─ 보호 경로 + 미인증 → redirect("/login?next=...")
    └─ 그 외 → 통과
         │
         ▼
    (app)/layout.tsx
         └─ Sidebar / GlobalHeader 결정
              │
              ▼
         page.tsx
              ├─ status === "empty" → /login   (DB 정합성 오류 방어, 유지)
              ├─ status === "error" → <ErrorUI>
              └─ 역할/팀멤버십 가드
```

---

## 검증

- TypeScript 타입 체크: 에러 0
- Next.js 빌드: 성공
