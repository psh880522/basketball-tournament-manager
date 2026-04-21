import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import EmptyState from "@/components/ui/EmptyState";
import { listTournamentMatches } from "@/lib/api/matches";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import { getStandingsByDivision } from "@/lib/api/standings";
import { listScheduleSlots, type ScheduleSlotRow } from "@/lib/api/schedule-slots";
import Card from "@/components/ui/Card";
import {
  formatTournamentCategoryLabel,
  formatTournamentMatchLabel,
} from "@/lib/formatters/matchLabel";
import {
  buildTournamentRoundMetaByRound,
  type TournamentRoundMeta,
} from "@/lib/formatters/tournamentRoundMeta";
import {
  compareTournamentMatchOrder,
  getInitialRoundFromRoundMap,
} from "@/lib/formatters/tournamentMatchOrder";
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
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });
  return `${values.hour}:${values.minute}`;
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
        <EmptyState message="프로필 정보를 찾을 수 없습니다." />
      </main>
    );
  }
  if (!isOperationRole(userResult.role)) redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;

  const [matchesRes, divisionsRes, courtsRes, slotsRes] = await Promise.all([
    listTournamentMatches(id, {
      divisionId: sp.division || undefined,
      courtId: sp.court || undefined,
    }),
    getDivisionsByTournament(id),
    getCourtsByTournament(id),
    listScheduleSlots(id),
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

  const breakSlots = (slotsRes.data ?? []).filter((s) => {
    if (s.slot_type !== "break") return false;
    if (sp.division && s.division_id !== sp.division) return false;
    if (sp.court && s.court_id !== sp.court) return false;
    return true;
  });

  const hasFilters = sp.division || sp.court;

  return (
    <main className="mx-auto max-w-4xl p-6">
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
            경기 생성
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
            : "아직 생성된 경기가 없습니다. 경기 생성에서 생성하세요."}
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

          const divisionTournamentMap = new Map<
            string,
            (typeof matches)[number][]
          >();

          matches.forEach((match) => {
            if (match.groupType !== "tournament") return;
            const list = divisionTournamentMap.get(match.division_id) ?? [];
            list.push(match);
            divisionTournamentMap.set(match.division_id, list);
          });

          const divisionMetaMap = new Map<string, Map<string, TournamentRoundMeta>>();

          divisionTournamentMap.forEach((divisionMatches, divisionId) => {
            const roundMap = new Map<
              string,
              (typeof divisionMatches)[number][]
            >();
            divisionMatches.forEach((match) => {
              const key = match.groupName ?? "tournament";
              const list = roundMap.get(key) ?? [];
              list.push(match);
              roundMap.set(key, list);
            });

            const initialRound = getInitialRoundFromRoundMap(roundMap);
            const metaById = buildTournamentRoundMetaByRound(roundMap, {
              getId: (match) => match.id,
              sort: (left, right) =>
                compareTournamentMatchOrder(
                  {
                    id: left.id,
                    groupName: left.groupName ?? null,
                    seedA: left.seedA ?? null,
                    seedB: left.seedB ?? null,
                    createdAt: left.created_at ?? null,
                  },
                  {
                    id: right.id,
                    groupName: right.groupName ?? null,
                    seedA: right.seedA ?? null,
                    seedB: right.seedB ?? null,
                    createdAt: right.created_at ?? null,
                  },
                  initialRound
                ),
            });
            divisionMetaMap.set(divisionId, metaById);
          });

          type DivisionSection = {
            id: string;
            label: string;
            order: number;
            leagueMatches: typeof matches;
            tournamentMatches: typeof matches;
            breakSlots: ScheduleSlotRow[];
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
                breakSlots: [],
              });
            }

            const divisionSection = entry.divisions.get(m.division_id);
            if (!divisionSection) continue;

            if (m.groupType === "tournament") {
              divisionSection.tournamentMatches.push(m);
            } else {
              divisionSection.leagueMatches.push(m);
            }
            entry.section.totalMatches += 1;
          }

          for (const slot of breakSlots) {
            const courtKey = slot.court_id ?? "__unassigned__";
            const divisionId = slot.division_id ?? "__unassigned__";
            if (!sectionMap.has(courtKey)) {
              const courtName = courts.find((c) => c.id === slot.court_id)?.name ?? "미배정";
              sectionMap.set(courtKey, {
                section: {
                  key: courtKey,
                  label: courtName,
                  order: slot.court_id ? (courtOrder.get(slot.court_id) ?? 999) : 9999,
                  divisions: [],
                  totalMatches: 0,
                },
                divisions: new Map(),
              });
            }
            const entry = sectionMap.get(courtKey)!;
            if (!entry.divisions.has(divisionId)) {
              const divisionName = divisions.find((d) => d.id === slot.division_id)?.name ?? "미배정";
              entry.divisions.set(divisionId, {
                id: divisionId,
                label: divisionName,
                order: slot.division_id ? (divisionOrder.get(slot.division_id) ?? 999) : 9999,
                leagueMatches: [],
                tournamentMatches: [],
                breakSlots: [],
              });
            }
            entry.divisions.get(divisionId)!.breakSlots.push(slot);
          }

          const sections = [...sectionMap.values()].sort(
            (a, b) => a.section.order - b.section.order
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
                  <Card key={section.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        🏀 {section.label}
                      </h2>
                      <span className="ml-auto text-xs text-gray-400">
                        {section.totalMatches}경기
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {divisionsList.map((division) => (
                        <div key={division.id} className="space-y-1 pt-2">
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-sm font-medium text-gray-700">
                              {division.label}
                            </span>
                            <span className="ml-auto text-xs text-gray-400">
                              {division.leagueMatches.length +
                                division.tournamentMatches.length}
                              경기
                              {division.breakSlots.length > 0 && ` · 휴식 ${division.breakSlots.length}`}
                            </span>
                          </div>

                          {(() => {
                            type MatchRow = (typeof matches)[number] & { _kind: "match" };
                            type BreakRow = ScheduleSlotRow & { _kind: "break" };
                            type TableRow = MatchRow | BreakRow;

                            const allRows: TableRow[] = [
                              ...division.leagueMatches.map((m) => ({ ...m, _kind: "match" as const })),
                              ...division.tournamentMatches.map((m) => ({ ...m, _kind: "match" as const })),
                              ...division.breakSlots.map((s) => ({ ...s, _kind: "break" as const })),
                            ].sort((a, b) => {
                              const aTime = a._kind === "match"
                                ? (a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity)
                                : (a.start_at ? Date.parse(a.start_at) : Infinity);
                              const bTime = b._kind === "match"
                                ? (b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity)
                                : (b.start_at ? Date.parse(b.start_at) : Infinity);
                              if (aTime !== bTime) return aTime - bTime;
                              return a.id.localeCompare(b.id);
                            });

                            const metaById = divisionMetaMap.get(division.id) ?? new Map();

                            return (
                              <div className="overflow-x-auto">
                                <table className="w-full table-fixed text-center text-sm">
                                  <colgroup>
                                    <col className="w-20" />{/* 시간 */}
                                    <col className="w-20" />{/* 경기유형 */}
                                    <col className="w-20" />{/* 구분 */}
                                    <col className="w-14" />{/* 점수A */}
                                    <col />{/* 팀명A */}
                                    <col className="w-10" />{/* vs */}
                                    <col />{/* 팀명B */}
                                    <col className="w-14" />{/* 점수B */}
                                    <col className="w-20" />{/* 상태 */}
                                  </colgroup>
                                  <thead>
                                    <tr className="border-b text-xs text-gray-500">
                                      <th className="px-2 py-1">시간</th>
                                      <th className="px-2 py-1">유형</th>
                                      <th className="px-2 py-1">구분</th>
                                      <th className="px-2 py-1">점수</th>
                                      <th className="px-2 py-1">팀명</th>
                                      <th className="px-2 py-1">vs</th>
                                      <th className="px-2 py-1">팀명</th>
                                      <th className="px-2 py-1">점수</th>
                                      <th className="px-2 py-1">상태</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allRows.map((row) => {
                                      if (row._kind === "break") {
                                        return (
                                          <tr key={row.id} className="border-b hover:bg-white">
                                            <td className="whitespace-nowrap px-2 py-1 text-gray-600">
                                              {formatTime(row.start_at)}
                                            </td>
                                            <td className="px-2 py-1">
                                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">휴식</span>
                                            </td>
                                            <td className="px-2 py-1 text-gray-400">-</td>
                                            <td className="px-2 py-1 text-gray-400">-</td>
                                            <td className="px-2 py-1 text-gray-600 font-medium" colSpan={3}>
                                              {row.label ?? "휴식시간"}
                                            </td>
                                            <td className="px-2 py-1 text-gray-400">-</td>
                                            <td className="px-2 py-1 text-gray-400">-</td>
                                          </tr>
                                        );
                                      }
                                      const m = row;
                                      if (m.groupType === "tournament") {
                                        const rankMap = divisionRanks[division.id] ?? {};
                                        const seedA = m.team_a_id
                                          ? rankMap[m.team_a_id] ?? null
                                          : null;
                                        const seedB = m.team_b_id
                                          ? rankMap[m.team_b_id] ?? null
                                          : null;
                                        const meta = metaById.get(m.id) ?? null;
                                        const roundIndex = meta?.roundIndex ?? null;
                                        const roundTotal = meta?.roundTotal ?? null;
                                        const initialRound = meta?.initialRound ?? null;
                                        const previousRoundTotal =
                                          meta?.previousRoundTotal ?? null;
                                        const matchLabel = formatTournamentMatchLabel({
                                          groupName: m.groupName,
                                          teamA: m.teamAName,
                                          teamB: m.teamBName,
                                          seedA,
                                          seedB,
                                          roundIndex,
                                          roundTotal,
                                          initialRound,
                                          previousRoundTotal,
                                        });
                                        const vsIdx = matchLabel.indexOf(" vs ");
                                        const labelA = vsIdx !== -1 ? matchLabel.slice(0, vsIdx) : matchLabel;
                                        const labelB = vsIdx !== -1 ? matchLabel.slice(vsIdx + 4) : null;
                                        return (
                                          <tr key={m.id} className="border-b hover:bg-white">
                                            <td className="whitespace-nowrap px-2 py-1 text-gray-600">
                                              {formatTime(m.scheduled_at)}
                                            </td>
                                            <td className="px-2 py-1">
                                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">토너먼트</span>
                                            </td>
                                            <td className="px-2 py-1 text-gray-600">
                                              {formatTournamentCategoryLabel(
                                                m.groupName,
                                                roundIndex,
                                                roundTotal
                                              )}
                                            </td>
                                            <td className="px-2 py-1 font-semibold text-gray-800">
                                              {m.score_a !== null ? m.score_a : "-"}
                                            </td>
                                            <td className="px-2 py-1 font-medium text-gray-800 truncate" title={labelA}>
                                              {labelA}
                                            </td>
                                            <td className="px-2 py-1 text-gray-400 text-xs">vs</td>
                                            <td className="px-2 py-1 font-medium text-gray-800 truncate" title={labelB ?? ""}>
                                              {labelB ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 font-semibold text-gray-800">
                                              {m.score_b !== null ? m.score_b : "-"}
                                            </td>
                                            <td className="px-2 py-1">
                                              <StatusBadge status={m.status} />
                                            </td>
                                          </tr>
                                        );
                                      } else {
                                        return (
                                          <tr key={m.id} className="border-b hover:bg-white">
                                            <td className="whitespace-nowrap px-2 py-1 text-gray-600">
                                              {formatTime(m.scheduled_at)}
                                            </td>
                                            <td className="px-2 py-1">
                                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">리그</span>
                                            </td>
                                            <td className="px-2 py-1 text-gray-600">
                                              {m.groupName ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 font-semibold text-gray-800">
                                              {m.score_a !== null ? m.score_a : "-"}
                                            </td>
                                            <td className="px-2 py-1 font-medium text-gray-800 truncate" title={m.teamAName}>
                                              {m.teamAName}
                                            </td>
                                            <td className="px-2 py-1 text-gray-400 text-xs">vs</td>
                                            <td className="px-2 py-1 font-medium text-gray-800 truncate" title={m.teamBName}>
                                              {m.teamBName}
                                            </td>
                                            <td className="px-2 py-1 font-semibold text-gray-800">
                                              {m.score_b !== null ? m.score_b : "-"}
                                            </td>
                                            <td className="px-2 py-1">
                                              <StatusBadge status={m.status} />
                                            </td>
                                          </tr>
                                        );
                                      }
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
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
