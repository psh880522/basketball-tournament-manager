import type { MatchListRow } from "@/lib/api/matches";

type Props = {
  matches: MatchListRow[];
  courts: { id: string; name: string }[];
  divisions: { id: string; name: string }[];
};

const ROUND_LABEL: Record<string, string> = {
  round_of_16: "16강",
  quarterfinal: "8강",
  semifinal: "4강",
  third_place: "3/4위전",
  final: "결승",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  in_progress: "진행 중",
  completed: "완료",
};

function formatTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const values: Record<string, string> = {};
  parts.forEach((p) => { if (p.type !== "literal") values[p.type] = p.value; });
  return `${values.hour}:${values.minute}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TypeBadge({ groupType }: { groupType: string | null }) {
  if (groupType === "tournament") {
    return <span className="inline-block rounded px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700">토너먼트</span>;
  }
  return <span className="inline-block rounded px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700">리그</span>;
}

type DivSection = {
  divisionId: string;
  divisionName: string;
  order: number;
  matches: MatchListRow[];
};

type CourtSection = {
  courtKey: string;
  courtName: string;
  order: number;
  totalMatches: number;
  divisions: Map<string, DivSection>;
};

export default function MatchesTable({ matches, courts, divisions }: Props) {
  if (matches.length === 0) return null;

  const courtOrder = new Map(courts.map((c, i) => [c.id, i]));
  const divisionOrder = new Map(divisions.map((d, i) => [d.id, i]));

  const courtMap = new Map<string, CourtSection>();

  for (const m of matches) {
    const courtKey = m.court_id ?? "__unassigned__";
    if (!courtMap.has(courtKey)) {
      courtMap.set(courtKey, {
        courtKey,
        courtName: m.courtName ?? "코트 미배정",
        order: m.court_id ? (courtOrder.get(m.court_id) ?? 999) : 9999,
        totalMatches: 0,
        divisions: new Map(),
      });
    }
    const courtSection = courtMap.get(courtKey)!;
    courtSection.totalMatches += 1;

    if (!courtSection.divisions.has(m.division_id)) {
      courtSection.divisions.set(m.division_id, {
        divisionId: m.division_id,
        divisionName: m.divisionName,
        order: divisionOrder.get(m.division_id) ?? 999,
        matches: [],
      });
    }
    courtSection.divisions.get(m.division_id)!.matches.push(m);
  }

  const sortedCourts = [...courtMap.values()].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {sortedCourts.map((court) => {
        const sortedDivisions = [...court.divisions.values()].sort((a, b) =>
          a.order !== b.order ? a.order - b.order : a.divisionName.localeCompare(b.divisionName, "ko-KR")
        );

        return (
          <div key={court.courtKey} className="overflow-hidden rounded-xl bg-white shadow-sm">
            {/* 코트 헤더 */}
            <div className="flex items-center gap-2 bg-[#f0f0f0] px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">🏀 {court.courtName}</span>
              <span className="ml-auto text-xs text-gray-400">{court.totalMatches}경기</span>
            </div>

            <div className="divide-y divide-gray-100">
              {sortedDivisions.map((div) => (
                <div key={div.divisionId}>
                  {/* 디비전 서브헤더 */}
                  <div className="flex items-center gap-2 bg-gray-50 px-4 py-2">
                    <span className="text-xs font-medium text-gray-600">{div.divisionName}</span>
                    <span className="ml-auto text-xs text-gray-400">{div.matches.length}경기</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] sm:min-w-[560px] table-fixed text-center text-sm">
                      <colgroup>
                        <col className="w-11 sm:w-14" />
                        <col className="hidden w-20 sm:table-column" />
                        <col className="w-12 sm:w-16" />
                        <col className="w-8 sm:w-10" />
                        <col className="w-[96px] sm:w-[120px]" />
                        <col className="w-5 sm:w-7" />
                        <col className="w-[96px] sm:w-[120px]" />
                        <col className="w-8 sm:w-10" />
                        <col className="w-[68px] sm:w-20" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                          <th className="px-1 py-2">시간</th>
                          <th className="hidden px-1 py-2 sm:table-cell">유형</th>
                          <th className="px-1 py-2">구분</th>
                          <th className="px-1 py-2">점수</th>
                          <th className="px-1 py-2">팀</th>
                          <th className="px-1 py-2">vs</th>
                          <th className="px-1 py-2">팀</th>
                          <th className="px-1 py-2">점수</th>
                          <th className="px-1 py-2">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {div.matches.map((m) => {
                          const isCompleted = m.status === "completed";
                          const winnerA =
                            isCompleted &&
                            m.score_a !== null &&
                            m.score_b !== null &&
                            m.score_a > m.score_b;
                          const winnerB =
                            isCompleted &&
                            m.score_a !== null &&
                            m.score_b !== null &&
                            m.score_b > m.score_a;
                          const roundLabel =
                            m.groupType === "tournament"
                              ? (ROUND_LABEL[m.groupName ?? ""] ?? m.groupName ?? "-")
                              : (m.groupName ?? "-");

                          return (
                            <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="whitespace-nowrap px-1 py-2.5 text-xs text-gray-500">
                                {formatTime(m.scheduled_at)}
                              </td>
                              <td className="hidden px-1 py-2.5 sm:table-cell">
                                <TypeBadge groupType={m.groupType} />
                              </td>
                              <td className="px-1 py-2.5 text-xs text-gray-600">{roundLabel}</td>
                              <td className={`px-1 py-2.5 tabular-nums font-semibold ${winnerA ? "text-gray-900" : "text-gray-400"}`}>
                                {m.score_a !== null ? m.score_a : "-"}
                              </td>
                              <td
                                className={`truncate px-1 py-2.5 text-xs font-medium ${
                                  winnerA
                                    ? "text-gray-900"
                                    : isCompleted
                                    ? "text-gray-400"
                                    : "text-gray-700"
                                }`}
                                title={m.teamAName}
                              >
                                {m.teamAName}
                              </td>
                              <td className="px-1 py-2.5 text-xs text-gray-400">vs</td>
                              <td
                                className={`truncate px-1 py-2.5 text-xs font-medium ${
                                  winnerB
                                    ? "text-gray-900"
                                    : isCompleted
                                    ? "text-gray-400"
                                    : "text-gray-700"
                                }`}
                                title={m.teamBName}
                              >
                                {m.teamBName}
                              </td>
                              <td className={`px-1 py-2.5 tabular-nums font-semibold ${winnerB ? "text-gray-900" : "text-gray-400"}`}>
                                {m.score_b !== null ? m.score_b : "-"}
                              </td>
                              <td className="px-1 py-2.5">
                                <StatusBadge status={m.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
