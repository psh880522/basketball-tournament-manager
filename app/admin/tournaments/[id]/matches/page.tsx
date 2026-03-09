import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listTournamentMatches } from "@/lib/api/matches";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
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
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-gray-100 text-gray-700",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
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
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          {hasFilters
            ? "조건에 맞는 경기가 없습니다."
            : "아직 생성된 경기가 없습니다. 조/경기 생성에서 생성하세요."}
        </div>
      ) : (
        (() => {
          /* 코트별 섹션으로 그룹핑 */
          const courtOrder = new Map(
            courts.map((c, i) => [c.id, i])
          );
          type Section = {
            key: string;
            label: string;
            order: number;
            matches: typeof matches;
          };
          const sectionMap = new Map<string, Section>();

          for (const m of matches) {
            const key = m.court_id ?? "__unassigned__";
            if (!sectionMap.has(key)) {
              sectionMap.set(key, {
                key,
                label: m.courtName ?? "미배정",
                order: m.court_id ? (courtOrder.get(m.court_id) ?? 999) : 9999,
                matches: [],
              });
            }
            sectionMap.get(key)!.matches.push(m);
          }

          const sections = [...sectionMap.values()].sort(
            (a, b) => a.order - b.order
          );

          return (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-700">
                      🏀 {section.label}
                    </h2>
                    <span className="text-xs text-gray-400">
                      {section.matches.length}경기
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-4 py-3">시간</th>
                          <th className="px-4 py-3">디비전</th>
                          <th className="px-4 py-3">경기</th>
                          <th className="px-4 py-3">상태</th>
                          <th className="px-4 py-3">점수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {section.matches.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                              {formatTime(m.scheduled_at)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                {m.divisionName}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {m.teamAName} vs {m.teamBName}
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
                </div>
              ))}
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
