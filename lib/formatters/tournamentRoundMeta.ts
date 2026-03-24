import {
  getInitialTournamentRound,
  getPreviousTournamentRound,
} from "@/lib/formatters/matchLabel";

export type TournamentRoundMeta = {
  roundIndex: number | null;
  roundTotal: number | null;
  previousRoundTotal: number | null;
  initialRound: string | null;
};

type BuildOptions<T> = {
  getId: (item: T) => string;
  sort: (left: T, right: T) => number;
};

export function buildTournamentRoundMetaByRound<T>(
  roundMap: Map<string, T[]>,
  options: BuildOptions<T>
): Map<string, TournamentRoundMeta> {
  const metaById = new Map<string, TournamentRoundMeta>();
  if (roundMap.size === 0) return metaById;

  const roundCounts = new Map<string, number>();
  roundMap.forEach((list, key) => {
    roundCounts.set(key, list.length);
  });

  const initialRound = getInitialTournamentRound(roundCounts);

  roundMap.forEach((list, key) => {
    const ordered = [...list].sort(options.sort);
    const roundTotal = roundCounts.get(key) ?? null;
    const previousRound = getPreviousTournamentRound(key);
    const previousRoundTotal = previousRound
      ? roundCounts.get(previousRound) ?? null
      : null;

    ordered.forEach((item, index) => {
      metaById.set(options.getId(item), {
        roundIndex: index + 1,
        roundTotal,
        previousRoundTotal,
        initialRound,
      });
    });
  });

  return metaById;
}
