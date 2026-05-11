import { Suspense } from "react";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getDivisionsByTournament, getDivisionApplicationCounts } from "@/lib/api/divisions";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { getMyApplicationStatus, getMyParticipationAsPlayer, type PlayerParticipation } from "@/lib/api/applications";
import Card from "@/components/ui/Card";
import TournamentStickyPanel from "./_components/TournamentStickyPanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function TournamentDetail({ id }: { id: string }) {
  const [tournamentResult, divisionsResult, userResult] = await Promise.all([
    getPublicTournamentById(id),
    getDivisionsByTournament(id),
    getUserWithRole(),
  ]);

  if (tournamentResult.error || !tournamentResult.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-rose-600">
          {tournamentResult.error
            ? "대회 정보를 불러오지 못했습니다."
            : "존재하지 않는 대회입니다."}
        </p>
      </main>
    );
  }

  if (divisionsResult.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-rose-600">부문 정보를 불러오지 못했습니다.</p>
      </main>
    );
  }

  const tournament = tournamentResult.data;
  const divisions = divisionsResult.data ?? [];
  const isLoggedIn = userResult.status === "ready";
  const isOrganizer = userResult.status === "ready" && userResult.role === "organizer";

  const [teamApplicationResult, countsResult] = await Promise.all([
    isLoggedIn
      ? getMyApplicationStatus(id)
      : Promise.resolve({ data: null, error: null }),
    isLoggedIn
      ? getDivisionApplicationCounts(id)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const teamApplication = teamApplicationResult.data;
  const counts = countsResult.data; // null = 비로그인, {} = 로그인 but 데이터 없음

  const playerParticipation: PlayerParticipation =
    isLoggedIn && !teamApplication
      ? await getMyParticipationAsPlayer(id)
      : { participating: false };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          {/* 포스터 — 모바일 1번, 데스크탑 좌측 상단 */}
          <div className="md:col-span-2">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              {tournament.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.poster_url}
                  alt={tournament.name}
                  className="mx-auto block w-full object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <span className="text-5xl">🏀</span>
                </div>
              )}
            </div>
          </div>

          {/* 패널 — 모바일 2번, 데스크탑 우측 (포스터+소개 2행 span) */}
          <div className="md:col-span-1 md:row-span-2">
            <TournamentStickyPanel
              tournament={tournament}
              divisions={divisions}
              counts={counts}
              myApplication={teamApplication ?? null}
              isLoggedIn={isLoggedIn}
              isOrganizer={isOrganizer}
              playerParticipation={playerParticipation}
            />
          </div>

          {/* 대회 소개 — 모바일 3번, 데스크탑 좌측 하단 */}
          {tournament.description && (
            <div className="md:col-span-2">
              <Card>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  대회 소개
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {tournament.description}
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-slate-400">로딩 중...</p>
        </main>
      }
    >
      <TournamentDetail id={id} />
    </Suspense>
  );
}
