import { getInitialTournamentRound } from "@/lib/formatters/matchLabel";

export type TournamentMatchOrderRow = {
  id: string;
  groupName: string | null;
  seedA?: number | null;
  seedB?: number | null;
  createdAt?: string | null;
};

export function getInitialRoundFromRoundMap<T>(
  roundMap: Map<string, T[]>
): string | null {
  const roundCounts = new Map<string, number>();
  roundMap.forEach((list, key) => {
    roundCounts.set(key, list.length);
  });

  return getInitialTournamentRound(roundCounts);
}

export function compareTournamentMatchOrder(
  left: TournamentMatchOrderRow,
  right: TournamentMatchOrderRow,
  initialRound: string | null
): number {
  const isInitialRound = Boolean(
    initialRound &&
      left.groupName === initialRound &&
      right.groupName === initialRound
  );

  if (isInitialRound) {
    const leftSeedA = left.seedA ?? 9999;
    const rightSeedA = right.seedA ?? 9999;
    if (leftSeedA !== rightSeedA) return leftSeedA - rightSeedA;

    const leftSeedB = left.seedB ?? 9999;
    const rightSeedB = right.seedB ?? 9999;
    if (leftSeedB !== rightSeedB) return rightSeedB - leftSeedB;
  }

  const leftCreated = left.createdAt ?? "";
  const rightCreated = right.createdAt ?? "";
  if (leftCreated !== rightCreated) {
    return leftCreated.localeCompare(rightCreated);
  }

  return left.id.localeCompare(right.id);
}
