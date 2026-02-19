# Vertical Slice Ticket

## 목표
- 이메일 링크(매직링크) 없이 **Email + Password로 회원가입**할 수 있다
- **Email + Password로 로그인**할 수 있다
- 테스트 계정을 빠르게 만들고 반복 로그인할 수 있다
- (Dev 우선) 이메일 확인 없이도 가입/로그인이 가능하도록 Supabase 설정을 맞춘다

---

## DB
- 변경 없음 (원칙)
- 단, 현재 프로젝트에서 가입/로그인 후 `profiles/roles` 생성이 필요한 구조라면
  - **기존 방식 유지**
  - 또는 “로그인 시 profile 없으면 생성” 방식으로 minimal diff

---

## Supabase 설정 (필수, Dev 프로젝트에서만)
- Authentication → Providers → Email
  - Email Provider: Enabled
  - **Confirm email: OFF**  (이메일 확인 끄기)
- Authentication → URL Configuration
  - Site URL: `http://localhost:3000` (로컬 기준)
  - Redirect URLs: `http://localhost:3000/**`

> 운영(Production)에서는 Confirm email을 다시 켤 수 있으니,
> 이 티켓에서는 Dev 환경에서만 동작 확인까지 포함한다.

---

## API
- `signUpWithPassword`
  - `supabase.auth.signUp({ email, password })`
- `signInWithPassword`
  - `supabase.auth.signInWithPassword({ email, password })`
- 성공 시 redirect(`/`) 또는 안전한 기본 경로로 이동

---

## UI
- `/signup`
  - email, password 입력 폼
  - 가입 버튼
  - 로딩/에러/성공 처리
- `/login`
  - email, password 입력 폼
  - 로그인 버튼
  - 로딩/에러 처리
- (선택) 로그인 페이지에 “회원가입” 링크, 회원가입 페이지에 “로그인” 링크

---

## 권한
- 누구나 접근 가능(비로그인)
- 로그인 후 보호 페이지 접근은 기존 RLS/권한 규칙 유지

---

## 수정 허용 범위 (필수)
- `/app/signup/page.tsx`
- `/app/signup/Form.tsx`
- `/app/signup/actions.ts`
- `/app/login/page.tsx`
- `/app/login/Form.tsx`
- `/app/login/actions.ts`
- `/lib/api/auth.ts`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- OAuth 로그인(구글/카카오)
- 비밀번호 재설정
- 이메일 인증/매직링크 로그인
- 프로필 편집 UI
- 관리자 초대/승격 플로우

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/signup`에서 email/password로 가입이 된다 (Dev Supabase Confirm email OFF 기준)
- [ ] `/login`에서 email/password로 로그인이 된다
- [ ] 로그인 성공 시 세션이 유지되고 보호 페이지 접근이 가능하다
- [ ] 로딩/에러/빈 입력 검증 UI가 있다
- [ ] Supabase 설정 체크리스트를 따라 Dev 환경에서 재현 가능하다
