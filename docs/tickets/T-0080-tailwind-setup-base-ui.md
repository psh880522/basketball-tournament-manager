# Vertical Slice Ticket

## 목표

- 프로젝트 UI 스타일링을 Tailwind 기반으로 통일할 수 있도록 기반을 만든다
- Tailwind가 실제로 적용되는 것을 `/`(Landing)에서 검증한다
- 공통 UI 컴포넌트(Button/Card/Badge)를 Tailwind로 제공하여
  이후 페이지 마이그레이션의 반복 작업을 줄인다

---

## 범위 요약 (중요)

- Tailwind 설치/설정 및 전역 적용을 확정한다
- 기본 UI 컴포넌트 3종(Button/Card/Badge)만 만든다
- `/`(Landing) 페이지를 Tailwind로 전환하여 기준 예시로 삼는다
- 다른 페이지는 이번 티켓에서 건드리지 않는다

---

## 구현 범위

### 1) Tailwind 설치/설정 확인 (필수)
- `tailwindcss`, `postcss`, `autoprefixer` 설치 여부 확인
- `tailwind.config.*` 생성/수정
  - `content`에 `app`, `components`, `lib` 경로가 포함되도록 설정
- `app/globals.css`에 Tailwind directives 추가/확인
  - `@tailwind base;`
  - `@tailwind components;`
  - `@tailwind utilities;`
- `app/layout.tsx`에서 `globals.css` import 확인

> 기존 스타일 시스템이 있더라도 제거하지 말고,
> Tailwind 적용을 우선 확인한다 (minimal diff)

---

### 2) 공통 UI 컴포넌트 추가 (필수)
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/Badge.tsx`

#### Button 요구사항
- variant: `primary | secondary | ghost` (최소 3개)
- disabled 스타일 포함
- `className` 확장 가능

#### Card 요구사항
- 기본 컨테이너 스타일 제공
- `className` 확장 가능

#### Badge 요구사항
- 상태용 배지에 사용 가능
- `className` 확장 가능

> 외부 라이브러리 추가 금지

---

### 3) `/` Landing 페이지 Tailwind 전환 (필수)
- `/app/page.tsx`에서 Tailwind 기반 레이아웃 적용
- 최소 구성:
  - Hero(타이틀/설명/CTA)
  - open tournaments 섹션(있다면)
  - 빈 상태/에러 상태

> 기존 T-0070 랜딩의 구조/데이터 로딩은 유지하고
> “스타일만” Tailwind로 바꾸는 것이 목표

---

## 스타일 가이드 (이번 티켓 기준)

- 페이지 컨테이너:
  - `mx-auto max-w-5xl px-4 py-8`
- 섹션 간격:
  - `space-y-6` 또는 `gap-4`
- 타이포:
  - 제목: `text-2xl font-semibold`
  - 섹션 제목: `text-lg font-semibold`
  - 본문: `text-sm text-gray-600`
- 카드:
  - `rounded-xl border bg-white p-4 shadow-sm`
- 버튼:
  - primary: `rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50`
  - secondary: `rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50`
  - ghost: `rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50`

---

## 권한
- 권한/인증 로직 변경 없음

---

## 수정 허용 범위 (필수)

- `tailwind.config.*`
- `postcss.config.*` (필요 시)
- `/app/globals.css`
- `/app/layout.tsx` (import 확인/최소 수정)
- `/app/page.tsx`
- `/components/ui/Button.tsx` (신규)
- `/components/ui/Card.tsx` (신규)
- `/components/ui/Badge.tsx` (신규)

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 다른 페이지 Tailwind 전환
- 디자인 시스템/테마 고도화
- 다크모드
- CSS 리셋 전면 교체
- UI 라이브러리 도입(shadcn 등)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] Tailwind가 빌드/런타임에서 정상 적용된다
- [ ] `/` 페이지에서 Tailwind 스타일이 적용된 것이 육안으로 확인된다
- [ ] Button/Card/Badge 공통 컴포넌트를 만들고 재사용한다
- [ ] 기존 기능 로직 변경 없이 스타일만 전환했다
- [ ] `npm run dev`에서 스타일 깨짐/에러가 없다
