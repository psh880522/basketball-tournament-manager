import { MapPin, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { UpcomingMatch } from "@/lib/types/dashboard";

type UpcomingMatchesProps = {
  matches: UpcomingMatch[];
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function getDateKey(iso: string) {
  return iso.slice(0, 10);
}

export default function UpcomingMatches({ matches }: UpcomingMatchesProps) {
  if (matches.length === 0) return null;

  const displayed = matches.slice(0, 5);

  // 날짜별 그룹화
  const groups: { dateKey: string; dateLabel: string; matches: UpcomingMatch[] }[] = [];
  for (const match of displayed) {
    const dateKey = getDateKey(match.scheduledAt);
    const last = groups[groups.length - 1];
    if (last && last.dateKey === dateKey) {
      last.matches.push(match);
    } else {
      groups.push({
        dateKey,
        dateLabel: formatDate(match.scheduledAt),
        matches: [match],
      });
    }
  }

  return (
    <section id="upcoming-matches" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">다가오는 경기</h2>
        <span className="text-xs text-slate-400">최대 5경기</span>
      </div>

      <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
        {groups.map((group) => (
          <div key={group.dateKey}>
            <div className="flex items-center gap-2 bg-white px-4 py-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-500">{group.dateLabel}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {group.matches.map((match) => (
              <div key={match.matchId} className="flex items-start gap-4 p-4">
                <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">
                    {formatTime(match.scheduledAt)}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="live" className="shrink-0">{match.myTeamName}</Badge>
                    <span className="text-sm font-medium text-slate-700">
                      vs {match.opponentTeamName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-xs text-slate-500">{match.tournamentName}</span>
                    {match.roundLabel && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{match.roundLabel}</span>
                      </>
                    )}
                    {match.divisionName && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{match.divisionName}</span>
                      </>
                    )}
                  </div>

                  {match.courtName && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{match.courtName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </section>
  );
}
