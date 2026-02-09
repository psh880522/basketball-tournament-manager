# Slice New Feature Command

목적: 티켓 문서를 기준으로 수직 슬라이스 기능을 구현한다.

---

# 티켓 소스 (필수)

다음 티켓 파일을 먼저 읽고 요구사항을 추출해라:

- docs/tickets/_active.md

티켓의 목표 / 범위 / 권한 / 완료 기준을 그대로 따른다.

---

# 작업 규칙

- ai/rules/agent_rules.md 준수
- ai/rules/change_scope_rules.md 준수
- minimal diff 원칙
- 범위 밖 변경 금지

---

# 고정 파일 구조 규칙

- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

이 구조를 깨지 말 것.

---

# 에러 처리 규칙

반드시 포함:

- 로딩 상태
- 에러 메시지 UI
- 빈 데이터 상태
- 실패 케이스 반환값

---

# 출력 형식 (반드시 이 순서)

1. 변경/추가 파일 목록 + 각 파일 역할
2. 코드 (파일 단위 전체)
3. 실행 방법
4. 검증 체크리스트 (3~5개)
