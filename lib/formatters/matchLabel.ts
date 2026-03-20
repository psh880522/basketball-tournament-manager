const ROUND_LABELS: Record<string, string> = {
  round_of_16: "16강",
  quarterfinal: "8강",
  semifinal: "4강",
  final: "결승",
  third_place: "3/4위전",
};

const ROUND_ORDER = [
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "final",
  "third_place",
];

type LeagueLabelInput = {
  groupName?: string | null;
  teamA: string;
  teamB: string;
};

type TournamentLabelInput = {
  round?: string | null;
  teamA: string;
  teamB: string;
  seedA?: number | null;
  seedB?: number | null;
  roundIndex?: number | null;
  roundTotal?: number | null;
  initialRound?: string | null;
  previousRoundTotal?: number | null;
};

export function formatLeagueMatchLabel({
  groupName,
  teamA,
  teamB,
}: LeagueLabelInput): string {
  return `${teamA} vs ${teamB}`;
}

export function formatTournamentMatchLabel({
  round,
  teamA,
  teamB,
  seedA,
  seedB,
  roundIndex,
  roundTotal,
  initialRound,
  previousRoundTotal,
}: TournamentLabelInput): string {
  const isRealTeam = (name: string) => name !== "TBD" && name !== "-";
  const hasRealTeams = isRealTeam(teamA) && isRealTeam(teamB);
  if (hasRealTeams) return `${teamA} vs ${teamB}`;

  const isInitialRound = Boolean(initialRound && round === initialRound);
  if (isInitialRound) {
    const derivedSeedA = roundIndex ? roundIndex : null;
    const derivedSeedB =
      roundIndex && roundTotal ? roundTotal * 2 - roundIndex + 1 : null;
    const leftSeed = seedA ?? derivedSeedA;
    const rightSeed = seedB ?? derivedSeedB;
    if (leftSeed !== null && rightSeed !== null) {
      return `${leftSeed}위 vs ${rightSeed}위`;
    }
  }

  const needsFinalReference = round === "final" || round === "third_place";
  let referenceTotal = previousRoundTotal ?? (needsFinalReference ? roundTotal : null);
  if (needsFinalReference && (!referenceTotal || referenceTotal < 2)) {
    referenceTotal = 2;
  }

  if (referenceTotal && roundIndex) {
    const leftIndex = (roundIndex - 1) * 2 + 1;
    const rightIndex = leftIndex + 1;
    if (rightIndex <= referenceTotal) {
      const role = round === "third_place" ? "패자" : "승자";
      return `${leftIndex}경기 ${role} vs ${rightIndex}경기 ${role}`;
    }
  }

  if (seedA !== null && seedB !== null) {
    return `${seedA}위 vs ${seedB}위`;
  }

  return "-";
}

export function formatBreakLabel(): string {
  return "휴식시간";
}

export function formatRoundLabel(round: string | null): string {
  if (!round) return "토너먼트";
  return ROUND_LABELS[round] ?? round;
}

export function getInitialTournamentRound(
  roundCounts: Map<string, number>
): string | null {
  for (const round of ROUND_ORDER) {
    if ((roundCounts.get(round) ?? 0) > 0) return round;
  }
  return null;
}

export function getPreviousTournamentRound(round: string | null): string | null {
  if (!round) return null;
  const index = ROUND_ORDER.indexOf(round);
  if (index <= 0) return null;
  return ROUND_ORDER[index - 1] ?? null;
}

export function formatTournamentCategoryLabel(
  round: string | null,
  roundIndex: number | null,
  roundTotal: number | null
): string {
  const label = formatRoundLabel(round);
  if (round === "final" || round === "third_place") return label;
  if (!roundIndex || !roundTotal) return label;
  return `${label} ${roundIndex}경기`;
}
