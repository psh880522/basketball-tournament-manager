export const TOURNAMENT_SIZE_OPTIONS = [4, 8, 16] as const;

export const TOURNAMENT_SIZE_LABELS: Record<
  (typeof TOURNAMENT_SIZE_OPTIONS)[number],
  string
> = {
  4: "4강",
  8: "8강",
  16: "16강",
};
