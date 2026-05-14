# 소셜 로그인 (Google / Kakao OAuth) 구현 결과

> 작성일: 2026-05-14  
> 참조 플랜: `docs/ai-history/02-plans/20260514_소셜로그인_Plan_v1.md`

---

## 완료 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 타입 정의 (`lib/types/auth.ts`) | [완료] |
| Phase 2-a | `app/auth/callback/route.ts` 수정 | [완료] |
| Phase 2-b | `app/(auth)/terms/actions.ts` 신규 | [완료] |
| Phase 3-a | `components/auth/OAuthButtons.tsx` 신규 | [완료] |
| Phase 3-b | `components/auth/OAuthDivider.tsx` 신규 | [완료] |
| Phase 4-a | `login/page.tsx` + `login/Form.tsx` 수정 | [완료] |
| Phase 4-b | `signup/page.tsx` + `signup/Form.tsx` 수정 | [완료] |
| Phase 4-c | `terms/page.tsx` + `terms/Form.tsx` 신규 | [완료] |
| Phase 5 | RLS 정책 변경 없음 (기존 호환) | [완료] |
| 타입 체크 | `tsc --noEmit` | 에러 0 |
| 빌드 | `next build` | 성공 |

---

## 신규 생성 파일 (6개)

| 파일 | 설명 |
|------|------|
| `lib/types/auth.ts` | `OAuthProvider = "google" \| "kakao"` 타입 |
| `components/auth/OAuthButtons.tsx` | Google / Kakao OAuth 버튼 Client Component |
| `components/auth/OAuthDivider.tsx` | "또는" 구분선 컴포넌트 |
| `app/(auth)/terms/page.tsx` | 약관 동의 페이지 (`/terms`) Server Component |
| `app/(auth)/terms/Form.tsx` | 약관 동의 폼 Client Component |
| `app/(auth)/terms/actions.ts` | `saveTermsConsentAction()` 서버 액션 |

## 수정 파일 (5개)

| 파일 | 수정 내용 |
|------|----------|
| `app/auth/callback/route.ts` | OAuth 신규/기존 유저 분기, 역할 기반 리다이렉트, `next` 유무로 이메일/OAuth 플로우 구분 |
| `app/(auth)/login/page.tsx` | `searchParams.error` 읽어 `LoginForm`에 `initialError` prop 전달, subtitle 변경 |
| `app/(auth)/login/Form.tsx` | `OAuthButtons` + `OAuthDivider` 추가, `initialError` prop 추가 |
| `app/(auth)/signup/page.tsx` | subtitle 텍스트 변경 |
| `app/(auth)/signup/Form.tsx` | `OAuthButtons` + `OAuthDivider` 추가 |

---

## 주요 구현 결정 사항

### 콜백 플로우 분기 방식
- `next` 파라미터 **없음** → OAuth 플로우 (신규 유저 감지 + 역할 분기)
- `next` 파라미터 **있음** → 기존 이메일 확인/비밀번호 재설정 플로우 유지

### 신규 유저 감지
- `user.created_at` 기준 10초 이내 생성 시 신규 유저로 판단
- 신규 OR 약관 미동의 → `/terms?next=/onboarding/completion?step=signup`

### 쿠키 동기화 안전성
- `exchangeCodeForSession()` 후 동일 `supabase` 인스턴스 재사용
- `getUserWithRole()`, `getMyTermsConsentStatus()` 등 내부 클라이언트 생성 함수 미사용

### 외부 URL 리다이렉트 방지
- `next` 파라미터 처리 시 `/`로 시작하지 않으면 기본값으로 대체

---

## 빌드 결과 확인

```
✓ Compiled successfully in 10.8s
✓ Generating static pages (11/11)
```

신규 라우트 `/terms` 정상 등록 (`ƒ Dynamic`).  
`/login`은 `searchParams` 읽기로 인해 `ƒ Dynamic`으로 전환됨 (예상된 동작).

---

## 추가 작업 (코드 외, 배포 전 필수)

1. Supabase Dashboard → Authentication → Providers → Google 활성화
2. Supabase Dashboard → Authentication → Providers → Kakao 활성화
3. Supabase Dashboard → URL Configuration → Redirect URLs 등록
4. Google Cloud Console → OAuth 2.0 Redirect URI 등록
5. Kakao Developer Console → Redirect URI 등록
6. `.env.local` 및 Vercel 환경 변수에 `NEXT_PUBLIC_SITE_URL` 설정 확인
