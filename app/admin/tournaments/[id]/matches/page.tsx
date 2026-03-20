import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listTournamentMatches } from "@/lib/api/matches";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import { getStandingsByDivision } from "@/lib/api/standings";
import Card from "@/components/ui/Card";
import {
  formatLeagueMatchLabel,
  formatTournamentCategoryLabel,
  formatTournamentMatchLabel,
  getInitialTournamentRound,
  getPreviousTournamentRound,
} from "@/lib/formatters/matchLabel";
import MatchFilters from "./Filters";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ division?: string; court?: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  in_progress: "진행 중",
  completed: "완료",
};

function formatTime(iso: string | null) {
  if (!iso) return "미배정";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });
  return `${values.month}/${values.day} ${values.hour}:${values.minute}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        colors[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default async function TournamentMatchesPage({
  params,
  searchParams,
}: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");
  if (userResult.status === "error") {
    return (
      <main className="p-6">
        <p className="text-red-600">{userResult.error}</p>
      </main>
    );
  }
  if (userResult.status === "empty") {
    return (
      <main className="p-6">
        <p className="text-gray-500">프로필 정보를 찾을 수 없습니다.</p>
      </main>
    );
  }
  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;

  const [matchesRes, divisionsRes, courtsRes] = await Promise.all([
    listTournamentMatches(id, {
      divisionId: sp.division || undefined,
      courtId: sp.court || undefined,
    }),
    getDivisionsByTournament(id),
    getCourtsByTournament(id),
  ]);

  if (matchesRes.error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{matchesRes.error}</p>
      </main>
    );
  }

  const matches = matchesRes.data ?? [];
  const divisions = divisionsRes.data ?? [];
  const courts = courtsRes.data ?? [];
  const standingsResults = await Promise.all(
    divisions.map(async (division) => ({
      divisionId: division.id,
      result: await getStandingsByDivision(division.id),
    }))
  );
  const divisionRanks: Record<string, Record<string, number>> = {};
  standingsResults.forEach(({ divisionId, result }) => {
    if (!result.data) return;
    const map: Record<string, number> = {};
    result.data.forEach((row) => {
      if (row.team_id && row.rank) {
        map[row.team_id] = row.rank;
      }
    });
    divisionRanks[divisionId] = map;
  });

  const hasFilters = sp.division || sp.court;

  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">경기 목록</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/admin/tournaments/${id}`}
            className="text-blue-600 hover:underline"
          >
            운영 홈
          </Link>
          <Link
            href={`/admin/tournaments/${id}/bracket`}
            className="text-blue-600 hover:underline"
          >
            조/경기 생성
          </Link>
          <Link
            href={`/admin/tournaments/${id}/schedule`}
            className="text-blue-600 hover:underline"
          >
            스케줄
          </Link>
        </div>
      </div>

      {/* Filters */}
      <MatchFilters
        tournamentId={id}
        divisions={divisions.map((d) => ({ id: d.id, name: d.name }))}
        courts={courts.map((c) => ({ id: c.id, name: c.name }))}
        current={{ division: sp.division, court: sp.court }}
      />

      {/* Match list */}
      {matches.length === 0 ? (
        <Card className="text-center text-gray-500">
          {hasFilters
            ? "조건에 맞는 경기가 없습니다."
            : "아직 생성된 경기가 없습니다. 조/경기 생성에서 생성하세요."}
        </Card>
      ) : (
        (() => {
          /* 코트 > 디비전 > 리그/토너먼트 테이블 */
          const courtOrder = new Map(
            courts.map((c, i) => [c.id, i])
          );
          const divisionOrder = new Map(
            divisions.map((d, i) => [d.id, i])
          );

          type DivisionSection = {
            id: string;
            label: string;
            order: number;
            leagueMatches: typeof matches;
            tournamentMatches: typeof matches;
          };

          type Section = {
            key: string;
            label: string;
            order: number;
            divisions: DivisionSection[];
            totalMatches: number;
          };
          const sectionMap = new Map<
            string,
            { section: Section; divisions: Map<string, DivisionSection> }
          >();

          for (const m of matches) {
            const key = m.court_id ?? "__unassigned__";
            if (!sectionMap.has(key)) {
              sectionMap.set(key, {
                section: {
                  key,
                  label: m.courtName ?? "미배정",
                  order: m.court_id ? (courtOrder.get(m.court_id) ?? 999) : 9999,
                  divisions: [],
                  totalMatches: 0,
                },
                divisions: new Map<string, DivisionSection>(),
              });
            }

            const entry = sectionMap.get(key);
            if (!entry) continue;

            if (!entry.divisions.has(m.division_id)) {
              entry.divisions.set(m.division_id, {
                id: m.division_id,
                label: m.divisionName,
                order: divisionOrder.get(m.division_id) ?? 999,
                leagueMatches: [],
                tournamentMatches: [],
              });
            }

            const divisionSection = entry.divisions.get(m.division_id);
            if (!divisionSection) continue;

            if (m.group_id) {
              divisionSection.leagueMatches.push(m);
            } else {
              divisionSection.tournamentMatches.push(m);
            }
            entry.section.totalMatches += 1;
          }

          const sections = [...sectionMap.values()].sort(
            (a, b) => a.order - b.order
          );

          return (
            <div className="space-y-6">
              {sections.map(({ section, divisions: divisionMap }) => {
                const divisionsList = [...divisionMap.values()].sort((a, b) =>
                  a.order !== b.order
                    ? a.order - b.order
                    : a.label.localeCompare(b.label, "ko-KR")
                );

                return (
                  <Card key={section.key}>
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-700">
                        🏀 {section.label}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {section.totalMatches}경기
                      </span>
                    </div>

                    <div className="space-y-4">
                      {divisionsList.map((division) => (
                        <Card key={division.id} className="bg-slate-50">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">
                              {division.label}
                            </h3>
                            <span className="text-xs text-gray-400">
                              {division.leagueMatches.length +
                                division.tournamentMatches.length}
                              경기
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="mb-2 text-xs font-semibold text-gray-500">
                                리그
                              </p>
                              {division.leagueMatches.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  리그 경기가 없습니다.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <table className="w-full table-fixed text-sm">
                                    <colgroup>
                                      <col className="w-28" />
                                      <col className="w-24" />
                                      <col className="w-auto" />
                                      <col className="w-24" />
                                      <col className="w-24" />
                                    </colgroup>
                                    <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                                      <tr>
                                        <th className="px-4 py-3">시간</th>
                                        <th className="px-4 py-3">구분</th>
                                        <th className="px-4 py-3">경기</th>
                                        <th className="px-4 py-3">상태</th>
                                        <th className="px-4 py-3">점수</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {division.leagueMatches.map((m) => (
                                        <tr key={m.id} className="hover:bg-gray-50">
                                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                            {formatTime(m.scheduled_at)}
                                          </td>
                                          <td className="px-4 py-3 text-gray-600">
                                            {m.groupName ?? "-"}
                                          </td>
                                          <td
                                            className="px-4 py-3 font-medium text-gray-800 truncate"
                                            title={formatLeagueMatchLabel({
                                              groupName: m.groupName,
                                              teamA: m.teamAName,
                                              teamB: m.teamBName,
                                            })}
                                          >
                                            {formatLeagueMatchLabel({
                                              groupName: m.groupName,
                                              teamA: m.teamAName,
                                              teamB: m.teamBName,
                                            })}
                                          </td>
                                          <td className="px-4 py-3">
                                            <StatusBadge status={m.status} />
                                          </td>
                                          <td className="px-4 py-3 text-gray-600">
                                            {m.score_a !== null && m.score_b !== null
                                              ? `${m.score_a} : ${m.score_b}`
                                              : "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold text-gray-500">
                                토너먼트
                              </p>
                              {division.tournamentMatches.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  토너먼트 경기가 없습니다.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <table className="w-full table-fixed text-sm">
                                    <colgroup>
                                      <col className="w-28" />
                                      <col className="w-28" />
                                      <col className="w-auto" />
                                      <col className="w-24" />
                                      <col className="w-24" />
                                    </colgroup>
                                    <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                                      <tr>
                                        <th className="px-4 py-3">시간</th>
                                        <th className="px-4 py-3">구분</th>
                                        <th className="px-4 py-3">경기</th>
                                        <th className="px-4 py-3">상태</th>
                                        <th className="px-4 py-3">점수</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {(() => {
                                        const roundCounts = new Map<string, number>();
                                        division.tournamentMatches.forEach((match) => {
                                          const key = match.round ?? "tournament";
                                          roundCounts.set(key, (roundCounts.get(key) ?? 0) + 1);
                                        });
                                        const initialRound =
                                          getInitialTournamentRound(roundCounts);
                                        const roundIndexes = new Map<string, number>();

                                        return division.tournamentMatches.map((m) => {
                                          const rankMap = divisionRanks[division.id] ?? {};
                                          const seedA = m.team_a_id
                                            ? rankMap[m.team_a_id] ?? null
                                            : null;
                                          const seedB = m.team_b_id
                                            ? rankMap[m.team_b_id] ?? null
                                            : null;
                                          const key = m.round ?? "tournament";
                                          const nextIndex = (roundIndexes.get(key) ?? 0) + 1;
                                          roundIndexes.set(key, nextIndex);
                                          const roundTotal = roundCounts.get(key) ?? null;
                                          const previousRound =
                                            getPreviousTournamentRound(m.round ?? null);
                                          const previousRoundTotal = previousRound
                                            ? roundCounts.get(previousRound) ?? null
                                            : null;
                                          const matchLabel = formatTournamentMatchLabel({
                                            round: m.round,
                                            teamA: m.teamAName,
                                            teamB: m.teamBName,
                                            seedA,
                                            seedB,
                                            roundIndex: nextIndex,
                                            roundTotal,
                                            initialRound,
                                            previousRoundTotal,
                                          });

                                          return (
                                            <tr key={m.id} className="hover:bg-gray-50">
                                              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {formatTime(m.scheduled_at)}
                                              </td>
                                              <td className="px-4 py-3 text-gray-600">
                                                {formatTournamentCategoryLabel(
                                                  m.round,
                                                  nextIndex,
                                                  roundTotal
                                                )}
                                              </td>
                                              <td
                                                className="px-4 py-3 font-medium text-gray-800 truncate"
                                                title={matchLabel}
                                              >
                                                {matchLabel}
                                              </td>
                                              <td className="px-4 py-3">
                                                <StatusBadge status={m.status} />
                                              </td>
                                              <td className="px-4 py-3 text-gray-600">
                                                {m.score_a !== null && m.score_b !== null
                                                  ? `${m.score_a} : ${m.score_b}`
                                                  : "-"}
                                              </td>
                                            </tr>
                                          );
                                        });
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()
      )}

      <p className="mt-3 text-right text-xs text-gray-400">
        총 {matches.length}경기
      </p>
    </main>
  );
}
