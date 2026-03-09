import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listStandingsPageData } from "@/lib/api/standings";
import StandingsForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    divisionId?: string;
    error?: string;
    success?: string;
  }>;
};

type DivisionSection = {
  id: string;
  name: string;
  sort_order: number;
  standings_dirty: boolean;
};

async function StandingsContent({
  tournamentId,
  searchParams,
}: {
  tournamentId: string;
  searchParams?: {
    divisionId?: string;
    error?: string;
    success?: string;
  };
}) {
  const standingsResult = await listStandingsPageData(tournamentId);
  if (standingsResult.error) {
    return <p className="text-red-600">{standingsResult.error}</p>;
  }

  const divisions = (standingsResult.data?.divisions ?? []) as DivisionSection[];
  const standings = standingsResult.data?.standings ?? [];

  if (divisions.length === 0) {
    return <p className="text-gray-500">디비전이 없습니다.</p>;
  }

  const message = searchParams?.divisionId
    ? {
        divisionId: searchParams.divisionId,
        tone: searchParams.error ? "error" : searchParams.success ? "success" : null,
        text: searchParams.error
          ? searchParams.error
          : searchParams.success
          ? "순위 계산이 완료되었습니다."
          : "",
      }
    : null;

  return (
    <div className="space-y-6">
      {divisions.map((division) => {
        const rows = standings.filter(
          (row) => row.division_id === division.id
        );
        const showMessage =
          message && message.divisionId === division.id && message.tone;

        return (
          <section key={division.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{division.name}</h2>
                {division.standings_dirty ? (
                  <span className="text-xs rounded bg-amber-100 text-amber-700 px-2 py-0.5">
                    ⚠ 순위 계산 필요
                  </span>
                ) : null}
              </div>
              <StandingsForm
                tournamentId={tournamentId}
                divisionId={division.id}
                disabled={false}
              />
            </div>

            {showMessage ? (
              <p
                className={
                  message?.tone === "error"
                    ? "text-sm text-red-600"
                    : "text-sm text-emerald-600"
                }
              >
                {message?.text}
              </p>
            ) : null}

            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">완료된 경기가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                    <tr>
                      <th className="px-3 py-2">순위</th>
                      <th className="px-3 py-2">팀</th>
                      <th className="px-3 py-2 text-center">승</th>
                      <th className="px-3 py-2 text-center">패</th>
                      <th className="px-3 py-2 text-center">득점</th>
                      <th className="px-3 py-2 text-center">실점</th>
                      <th className="px-3 py-2 text-center">득실</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{row.rank}</td>
                        <td className="px-3 py-2">
                          {row.teams?.team_name ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-center">{row.wins}</td>
                        <td className="px-3 py-2 text-center">{row.losses}</td>
                        <td className="px-3 py-2 text-center">{row.points_for}</td>
                        <td className="px-3 py-2 text-center">
                          {row.points_against}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.points_diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default async function TournamentStandingsPage({
  params,
  searchParams,
}: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");
  if (userResult.status === "error") {
    return (
      <main className="p-6">
        <p className="text-red-600">
          {userResult.error ?? "사용자 정보를 불러오지 못했습니다."}
        </p>
      </main>
    );
  }
  if (userResult.status === "empty") {
    return (
      <main className="p-6">
        <p className="text-gray-600">프로필이 없습니다.</p>
      </main>
    );
  }
  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id: tournamentId } = await params;
  const sp = await searchParams;

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href={`/admin/tournaments/${tournamentId}`}
          className="text-blue-600 hover:underline"
        >
          운영 홈
        </a>
        <span className="text-gray-300">|</span>
        <a
          href={`/admin/tournaments/${tournamentId}/results`}
          className="text-blue-600 hover:underline"
        >
          경기 결과 입력
        </a>
      </div>
      <h1 className="text-2xl font-bold">대회 순위</h1>
      <Suspense fallback={<p className="text-sm text-gray-500">순위 불러오는 중...</p>}>
        <StandingsContent tournamentId={tournamentId} searchParams={sp} />
      </Suspense>
    </main>
  );
}
