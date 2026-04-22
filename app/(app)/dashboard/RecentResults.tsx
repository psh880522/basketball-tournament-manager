import Badge from "@/components/ui/Badge";
import type { CompletedMatch } from "@/lib/types/dashboard";

type RecentResultsProps = {
  results: CompletedMatch[];
};

export default function RecentResults({ results }: RecentResultsProps) {
  if (results.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">최근 결과</h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm">
        {results.map((result) => (
          <div
            key={result.matchId}
            className="flex items-center gap-3 px-4 py-3"
          >
            <Badge variant="live" className="shrink-0">{result.myTeamName}</Badge>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-500">
                {result.tournamentName}
                {result.divisionName ? ` · ${result.divisionName}` : ""}
              </p>
              <p className="truncate text-xs text-slate-400">
                vs {result.opponentTeamName}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={[
                  "text-sm font-bold",
                  result.isWin ? "text-emerald-600" : "text-rose-600",
                ].join(" ")}
              >
                {result.isWin ? "승" : "패"}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {result.myScore} - {result.opponentScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
