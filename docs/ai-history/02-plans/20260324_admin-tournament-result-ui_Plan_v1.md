# 구현 계획: Admin Tournament Result UI & Seeding Update

**기능명**: admin-tournament-result-ui

## 1. 구현해야 할 기능 상세 설명

### 1.1 UI 변경
- **경기 테이블 섹션 Card 뎁스 축소**
  - 리그 결과 입력 섹션, 토너먼트 결과 입력 섹션에서 **최상위 Card를 제거**
  - 코트별 Card와 내부 테이블 Card는 유지
  - UI 구성 요소는 유지하면서 래핑 Card만 제거하여 구조를 단순화

- **토너먼트 진행 상태 섹션 제거**
  - `ResultForm` 하단의 “토너먼트 진행 상태” 섹션 삭제
  - 진행 상태 데이터를 렌더링하는 UI 블록 전체 제거
  - 데이터 페칭(`getTournamentBracketProgress`)은 유지하거나 정리 여부 결정 (UI에선 사용하지 않음)

### 1.2 토너먼트 팀 배치 로직 개선
- **현재 문제**: `division.tournament_size` 기반으로 첫 라운드를 정해 4강만 배치되는 문제
- **변경 목표**: 실제 DB에 생성된 토너먼트 라운드(`groups` 테이블)의 첫 라운드에 맞춰 배치

//TODO: **변경 목표**랑 토너먼트 경기 생성시 입력된 값을 division.tournament_size에 업데이트 하는 방향 중 팀배치시 더 효율적인 방법으로 선택

**새 로직 개요**
1) division 내 `groups.type = 'tournament'` 중 가장 작은 `order` 값을 가진 그룹을 첫 라운드로 선택
2) 해당 그룹에 속한 matches를 생성 순서 기준으로 가져오기
3) standings 상위 팀을 seed pair로 매핑하여 matches에 배치

## 2. 추가 설치해야 할 라이브러리
- **없음**
- 기존 Next.js + Supabase 구성으로 충분하며, 추가 패키지 필요 없음

## 3. 변경/추가될 파일 목록

### 3.1 변경 대상
- `app/admin/tournaments/[id]/result/components/ResultForm.tsx`
  - UI Card 뎁스 조정
  - 토너먼트 진행 상태 섹션 제거

- `lib/api/results.ts`
  - `seedTournamentTeamsFromConfirmedStandings` 로직 수정
  - `roundByTournamentSize` 기반 first round 선택 → `groups.order` 기반 선택으로 변경

### 3.2 추가 파일
- 없음

## 4. 파일별 구현 스니펫 (Pseudocode/핵심 로직)

### 4.1 `app/admin/tournaments/[id]/result/components/ResultForm.tsx`

#### (1) 리그/토너먼트 테이블 섹션 최상위 Card 제거
```tsx
// 변경 전
<Card>  // 최상위 카드
  <div>...</div>
  <Card>코트별 ...</Card>
</Card>

// 변경 후
<div className="space-y-4">
  <div>...</div>
  <Card>코트별 ...</Card>
</div>
```

#### (2) 토너먼트 진행 상태 섹션 삭제
```tsx
// 삭제 대상
<Card>
  <h2>토너먼트 진행 상태</h2>
  ...
</Card>
```

### 4.2 `lib/api/results.ts` – 시딩 로직 개선

#### (1) 첫 라운드 그룹 선택 로직 변경
```ts
// 변경 전: tournament_size 기반
const size = tournament_size ?? 0;
const firstRound = roundByTournamentSize[size];

// 변경 후: groups.order 기반
const { data: roundGroups } = await supabase
  .from("groups")
  .select("id,name,order")
  .eq("division_id", divisionId)
  .eq("type", "tournament")
  .order("order", { ascending: true });

const firstGroup = (roundGroups ?? [])[0];
if (!firstGroup) return error;
```

#### (2) matches 조회
```ts
const { data: roundMatches } = await supabase
  .from("matches")
  .select("id,team_a_id,team_b_id,created_at")
  .eq("division_id", divisionId)
  .eq("group_id", firstGroup.id)
  .order("created_at", { ascending: true });
```

#### (3) seed pair 매핑
```ts
const pairs = buildSeedPairs(size); // standings 상위 size 기준
for (i in pairs) {
  update matches[i].team_a_id, team_b_id
}
```

## 5. 트레이드오프 및 고려사항

- **group.order 정렬 기준 의존**
  - 라운드 순서가 잘못 저장되면 배치가 틀어질 가능성
  - 필요 시 order 값 검증 로직 고려

- **standings 수와 match 수 불일치**
  - match 수가 부족한 경우 에러 반환
  - standings 데이터가 부족한 경우도 에러 처리 필요

- **기존 `roundByTournamentSize` 의존성 축소**
  - 로직 변경 시 `roundByTournamentSize`는 preview나 검증 용도로만 활용 가능
  - 필요 없다면 추후 정리 가능하지만 이번 변경 범위에선 최소 변경 유지

- **UI 변경에 따른 레이아웃 간격 재조정 필요**
  - Card 제거 후 spacing이 좁아질 수 있음
  - `space-y-*` 클래스 재조정 필요 가능

## 6. 작업 순서 제안

1) `ResultForm.tsx`에서 UI 섹션 구조 정리
2) `seedTournamentTeamsFromConfirmedStandings` 로직 수정
3) lint/typecheck 확인 (선택)

---

> **주의**: 본 문서는 구현 계획이며, 실제 변경은 사용자의 승인 이후 진행합니다.
