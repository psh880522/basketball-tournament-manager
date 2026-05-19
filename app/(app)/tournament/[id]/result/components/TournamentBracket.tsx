"use client";

import DragScroll from "@/components/ui/DragScroll";
import type { TournamentBracketMatchRow } from "@/lib/api/matches";
import {
  compareTournamentMatchOrder,
  getInitialRoundFromRoundMap,
} from "@/lib/formatters/tournamentMatchOrder";

type Props = {
  matches: TournamentBracketMatchRow[];
};

const ROUND_ORDER = [
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "third_place",
  "final",
] as const;

const ROUND_LABEL: Record<string, string> = {
  round_of_16: "16강",
  quarterfinal: "8강",
  semifinal: "4강",
  third_place: "3/4위전",
  final: "결승",
};

// 라운드별 매치 카드 사이 수직 gap (px)
// 카드 높이 ≈ 72px 기준으로 산출
const ROUND_GAP_PX: Record<string, number> = {
  round_of_16: 8,
  quarterfinal: 80,   // 72 + 8
  semifinal: 232,     // (72 * 2 + 80) + 8
  third_place: 0,
  final: 0,
};

// ─────────────────────────────────────────
// BracketMatchCard
// ─────────────────────────────────────────
function BracketMatchCard({ match }: { match: TournamentBracketMatchRow }) {
  const isCompleted = match.status === "completed";
  const teamAName = match.team_a?.team_name ?? null;
  const teamBName = match.team_b?.team_name ?? null;
  const scoreA =
    isCompleted && match.score_a !== null ? String(match.score_a) : "-";
  const scoreB =
    isCompleted && match.score_b !== null ? String(match.score_b) : "-";

  const winnerA =
    isCompleted && match.winner_team_id && match.team_a
      ? match.winner_team_id === match.team_a.id
      : false;
  const winnerB =
    isCompleted && match.winner_team_id && match.team_b
      ? match.winner_team_id === match.team_b.id
      : false;

  const teamAClass = teamAName
    ? winnerA
      ? "bg-orange-50 border-l-2 border-[#FF6B00]"
      : "bg-white"
    : "bg-white";

  const teamBClass = teamBName
    ? winnerB
      ? "bg-orange-50 border-l-2 border-[#FF6B00]"
      : "bg-white"
    : "bg-white";

  const teamATextClass = teamAName
    ? winnerA
      ? "font-semibold text-gray-900"
      : isCompleted
      ? "text-gray-400"
      : "text-gray-700"
    : "text-gray-300";

  const teamBTextClass = teamBName
    ? winnerB
      ? "font-semibold text-gray-900"
      : isCompleted
      ? "text-gray-400"
      : "text-gray-700"
    : "text-gray-300";

  return (
    <div className="w-44 overflow-hidden rounded-lg border border-gray-200">
      <div
        className={`flex items-center justify-between border-b border-gray-100 px-3 py-2 ${teamAClass}`}
      >
        <span className={`truncate text-sm ${teamATextClass}`} style={{ maxWidth: "7rem" }}>
          {teamAName ?? "미정"}
        </span>
        <span className={`ml-1 tabular-nums text-sm ${teamATextClass}`}>
          {scoreA}
        </span>
      </div>
      <div
        className={`flex items-center justify-between px-3 py-2 ${teamBClass}`}
      >
        <span className={`truncate text-sm ${teamBTextClass}`} style={{ maxWidth: "7rem" }}>
          {teamBName ?? "미정"}
        </span>
        <span className={`ml-1 tabular-nums text-sm ${teamBTextClass}`}>
          {scoreB}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// BracketMatchPair
// ─────────────────────────────────────────
type BracketMatchPairProps = {
  matchA: TournamentBracketMatchRow;
  matchB?: TournamentBracketMatchRow;
  showConnector: boolean;
};

function BracketMatchPair({ matchA, matchB, showConnector }: BracketMatchPairProps) {
  // 카드 높이 72px 기준 수직 연결선 높이
  const CARD_HEIGHT = 72;
  const connectorHeight = CARD_HEIGHT;

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col">
        {/* 매치A */}
        <div className="flex items-center">
          <BracketMatchCard match={matchA} />
          {showConnector && matchB && (
            <div className="h-px w-4 bg-gray-300" />
          )}
        </div>

        {/* 수직 연결선 */}
        {matchB && showConnector && (
          <div
            className="w-4 self-end border-r border-gray-300"
            style={{ height: connectorHeight }}
          />
        )}

        {/* 매치B */}
        {matchB && (
          <div className="flex items-center">
            <BracketMatchCard match={matchB} />
            {showConnector && (
              <div className="h-px w-4 bg-gray-300" />
            )}
          </div>
        )}
      </div>

      {/* 다음 라운드 입력 수평선 (쌍 중앙) */}
      {showConnector && matchB && (
        <div className="h-px w-4 self-center bg-gray-300" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// BracketRoundColumn
// ─────────────────────────────────────────
type BracketRoundColumnProps = {
  round: string;
  matches: TournamentBracketMatchRow[];
  isLast: boolean;
};

function BracketRoundColumn({ round, matches, isLast }: BracketRoundColumnProps) {
  const gapPx = ROUND_GAP_PX[round] ?? 8;

  // 2개씩 pair로 묶기 (single match인 경우 matchB 없음)
  const pairs: [TournamentBracketMatchRow, TournamentBracketMatchRow | undefined][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push([matches[i], matches[i + 1]]);
  }

  return (
    <div className="flex flex-col items-center">
      {/* 라운드 레이블 */}
      <div className="mb-2 w-44 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        {ROUND_LABEL[round] ?? round}
      </div>

      {/* 매치 카드 */}
      <div className="flex flex-col" style={{ gap: gapPx }}>
        {pairs.map((pair, i) => (
          <BracketMatchPair
            key={pair[0].id}
            matchA={pair[0]}
            matchB={pair[1]}
            showConnector={!isLast}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TournamentBracket (main export)
// ─────────────────────────────────────────
export default function TournamentBracket({ matches }: Props) {
  if (matches.length === 0) return null;

  // 라운드별 분류
  const roundMap = new Map<string, TournamentBracketMatchRow[]>();
  matches.forEach((m) => {
    const round = m.group?.name ?? "";
    if (!round) return;
    const existing = roundMap.get(round);
    if (existing) {
      existing.push(m);
    } else {
      roundMap.set(round, [m]);
    }
  });

  // 존재하는 라운드만, ROUND_ORDER 기준으로 정렬
  const sortedRounds = ROUND_ORDER.filter((r) => roundMap.has(r));

  // 초기 라운드 결정 (seed 기반 정렬용)
  const initialRound = getInitialRoundFromRoundMap(roundMap);

  // 각 라운드 내 매치 정렬 (created_at 기준, 동점 시 id 폴백)
  // TournamentBracketMatchRow에 seed 필드가 없으므로 null 전달 → created_at으로 폴백됨
  const sortedMatchesPerRound: Record<string, TournamentBracketMatchRow[]> = {};
  sortedRounds.forEach((round) => {
    const raw = roundMap.get(round) ?? [];
    sortedMatchesPerRound[round] = [...raw].sort((a, b) =>
      compareTournamentMatchOrder(
        { id: a.id, groupName: round, seedA: null, seedB: null, createdAt: a.created_at },
        { id: b.id, groupName: round, seedA: null, seedB: null, createdAt: b.created_at },
        initialRound
      )
    );
  });

  const mainRounds = sortedRounds.filter(
    (r) => r !== "third_place" && r !== "final"
  );
  const hasThirdPlace = roundMap.has("third_place");
  const hasFinal = roundMap.has("final");

  return (
    <DragScroll className="overflow-x-auto rounded-lg py-4">
      <div
        className="flex flex-row items-start gap-0"
        style={{ minWidth: "fit-content" }}
      >
        {/* 16강 ~ 4강 */}
        {mainRounds.map((round) => (
          <BracketRoundColumn
            key={round}
            round={round}
            matches={sortedMatchesPerRound[round] ?? []}
            isLast={false}
          />
        ))}

        {/* 3/4위전 + 결승 나란히 */}
        {(hasThirdPlace || hasFinal) && (
          <div className="flex flex-col gap-6">
            {hasThirdPlace && (
              <BracketRoundColumn
                round="third_place"
                matches={sortedMatchesPerRound["third_place"] ?? []}
                isLast={true}
              />
            )}
            {hasFinal && (
              <BracketRoundColumn
                round="final"
                matches={sortedMatchesPerRound["final"] ?? []}
                isLast={true}
              />
            )}
          </div>
        )}
      </div>
    </DragScroll>
  );
}
