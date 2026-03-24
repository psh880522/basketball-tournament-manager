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
  groupName?: string | null;
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
  groupName,
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

  const leftIsReal = isRealTeam(teamA);
  const rightIsReal = isRealTeam(teamB);

  const isInitialRound = Boolean(initialRound && groupName === initialRound);
  if (isInitialRound) {
    const derivedSeedA = roundIndex ? roundIndex : null;
    const derivedSeedB =
      roundIndex && roundTotal ? roundTotal * 2 - roundIndex + 1 : null;
    const leftSeed = seedA ?? derivedSeedA;
    const rightSeed = seedB ?? derivedSeedB;
    const leftLabel = leftSeed !== null ? `${leftSeed}위` : null;
    const rightLabel = rightSeed !== null ? `${rightSeed}위` : null;
    if (leftLabel && rightLabel) return `${leftLabel} vs ${rightLabel}`;
    if (leftIsReal && rightLabel) return `${teamA} vs ${rightLabel}`;
    if (rightIsReal && leftLabel) return `${leftLabel} vs ${teamB}`;
  }

  const needsFinalReference = groupName === "final" || groupName === "third_place";
  let referenceTotal = previousRoundTotal ?? (needsFinalReference ? roundTotal : null);
  if (needsFinalReference && (!referenceTotal || referenceTotal < 2)) {
    referenceTotal = 2;
  }

  if (referenceTotal && roundIndex) {
    const leftIndex = (roundIndex - 1) * 2 + 1;
    const rightIndex = leftIndex + 1;
    if (rightIndex <= referenceTotal) {
      const role = groupName === "third_place" ? "패자" : "승자";
      const leftRef = `${leftIndex}경기 ${role}`;
      const rightRef = `${rightIndex}경기 ${role}`;
      if (leftIsReal && !rightIsReal) return `${teamA} vs ${rightRef}`;
      if (rightIsReal && !leftIsReal) return `${leftRef} vs ${teamB}`;
      return `${leftRef} vs ${rightRef}`;
    }
  }

  if (seedA !== null || seedB !== null) {
    const leftLabel = seedA !== null ? `${seedA}위` : null;
    const rightLabel = seedB !== null ? `${seedB}위` : null;
    if (leftLabel && rightLabel) return `${leftLabel} vs ${rightLabel}`;
    if (leftIsReal && rightLabel) return `${teamA} vs ${rightLabel}`;
    if (rightIsReal && leftLabel) return `${leftLabel} vs ${teamB}`;
  }

  if (leftIsReal && !rightIsReal) return `${teamA} vs TBD`;
  if (rightIsReal && !leftIsReal) return `TBD vs ${teamB}`;
  return "-";
}

export function formatBreakLabel(): string {
  return "휴식시간";
}

export function formatRoundLabel(groupName: string | null): string {
  if (!groupName) return "토너먼트";
  return ROUND_LABELS[groupName] ?? groupName;
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
  groupName: string | null,
  roundIndex: number | null,
  roundTotal: number | null
): string {
  const label = formatRoundLabel(groupName);
  if (groupName === "final" || groupName === "third_place") return label;
  if (!roundIndex || !roundTotal) return label;
  return `${label} ${roundIndex}경기`;
}
