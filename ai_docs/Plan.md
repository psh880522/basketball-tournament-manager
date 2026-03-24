# 대회 수정 페이지 UI 개선 상세 플랜

작성일: 2026-03-20
대상: admin/tournaments/[id]/edit
목표: 대회 수정 화면을 생성 페이지와 일관된 UI로 개선하고, 입력 흐름/오류 피드백/가이드를 강화한다.

---

## 1) 구현해야 할 기능 상세 설명

### 1-1. UI 일관성 확보
- new 페이지의 인라인 스타일을 제거하고 Tailwind + 공용 UI 컴포넌트(Card, Button)로 통일.
- edit 페이지와 유사한 레이아웃(페이지 헤더 + 카드 폼 구성)으로 맞춘다.

### 1-2. 폼 구조 개선
- 필수/선택 항목을 구분하고 라벨/설명 텍스트를 한국어로 통일.
- 입력 필드에 공통 스타일 적용(rounded border, spacing, focus ring).
- 제출 버튼 상태(로딩/비활성)와 에러 메시지 표현을 명확히 제공.
- UI 레이아웃 정렬/간격을 안정적으로 유지해 폼이 틀어지지 않도록 한다.
- 생성 단계에서 division, court 추가 기능을 포함한다.
- division, court 섹션은 별도 카드가 아닌 메인 카드 내부 섹션으로 구성한다.
- division의 "토너먼트 슬롯 포함" 옵션은 노출하지 않도록 한다.


### 1-3. 입력 가이드 강화
- 시작일/종료일/팀 수 등의 제약 조건을 짧은 안내문으로 표시.
- 날짜 입력의 프론트 유효성 체크는 추가하지 않는다(하루짜리 대회 고려).

### 1-4. 성공/오류 피드백 개선
- 성공 시 알림 메시지 + 목록 이동 안내.
- 실패 시 서버 메시지를 한국어로 정리(가능하면 프론트에서 보조 문구).

### 1-5. API 흐름 유지
- /api/admin/tournaments POST 방식은 유지.
- 서버 응답 구조(id/error)는 그대로 사용.

---

## 2) 추가 설치해야 할 라이브러리 [완료]

- 없음.
- 기존 Tailwind + UI 컴포넌트로 충분히 구현 가능.

---

## 3) 변경될 파일 경로 및 추가될 파일 목록 [완료]

### 수정 예정 파일
- app/admin/tournaments/new/page.tsx
  - 레이아웃을 Tailwind/공용 컴포넌트 기반으로 변경
- app/admin/tournaments/new/Form.tsx
  - 한국어 라벨/가이드/에러 메시지
  - 입력 유효성(팀 수) 프론트 체크 추가
  - 버튼 스타일 및 메시지 UI 개선
  - division/court 입력 섹션 포함
- app/admin/tournaments/[id]/edit/page.tsx
  - new 페이지와 톤 일관성 검토(필요 시 경미한 문구/레이아웃 조정)

### 추가 예정 파일 (선택)
- components/ui/FieldHint.tsx (선택)
  - 입력 도움말 텍스트를 통일하기 위한 경량 컴포넌트

---

## 4) 파일별 핵심 로직/스니펫 (Pseudocode) [완료]

### 4-1. app/admin/tournaments/new/page.tsx

```tsx
<main className="min-h-screen bg-gray-50 px-4 py-8">
  <div className="mx-auto max-w-3xl space-y-6">
    <header>
      <h1>대회 생성</h1>
      <p>대회 기본 정보를 입력하세요.</p>
    </header>
    <Card>
      <NewTournamentForm />
    </Card>
  </div>
</main>
```

### 4-2. app/admin/tournaments/new/Form.tsx

```tsx
// form state + validation
const isMaxTeamsValid = !max_teams || max_teams >= 2

onSubmit =>
  if (!isMaxTeamsValid) setMessage("최대 팀 수는 2 이상의 정수여야 합니다.")
  else POST /api/admin/tournaments

// UI: 공통 input 스타일 + 한국어 라벨
<label>대회명</label>
<input className="..." />
<Hint>예: 2026 봄 리그</Hint>

<button className="...">{pending ? "생성 중..." : "생성"}</button>

// division/court 섹션은 메인 카드 내부로 포함
<Section title="디비전 설정">
  <AddDivisionForm showTournamentSlots={false} />
</Section>
<Section title="코트 설정">
  <AddCourtForm />
</Section>
```

### 4-3. components/ui/FieldHint.tsx (선택)

```tsx
export default function FieldHint({ children }) {
  return <p className="text-xs text-gray-500">{children}</p>
}
```

---

## 5) 트레이드오프 및 고려 사항 [완료]

- 프론트 유효성 검증 추가 시 서버 검증과 이중 관리 필요.
- 에러 메시지 한글화는 서버 응답 메시지와 불일치 가능.
- new 페이지 개선 시 edit 페이지와의 톤 일관성 유지가 중요.
- API 호출 방식(fetch) 유지하면 서버 액션 기반으로 통일하지는 못함.

---

## 6) 작업 순서 제안 [완료]

1. new/page.tsx 레이아웃 개선
2. new/Form.tsx 입력 UI 및 메시지 개선
3. 필요 시 edit/page.tsx 문구/톤 정리
4. (선택) FieldHint 컴포넌트 추가

---


위 계획은 코드 구현 없이 UI 구조와 메시지 흐름을 먼저 확정하기 위한 문서입니다.
승인 후 실제 변경 작업을 진행합니다.
