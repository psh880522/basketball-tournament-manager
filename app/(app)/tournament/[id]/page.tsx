import { Suspense } from "react";
import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getDivisionsByTournament, getDivisionApplicationCounts } from "@/lib/api/divisions";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { getMyApplicationStatus } from "@/lib/api/applications";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type PageProps = {
  params: Promise<{ id: string }>;
};

const tournamentStatusMap = {
  open: { variant: "success" as const, label: "모집중" },
  closed: { variant: "danger" as const, label: "모집마감" },
  finished: { variant: "default" as const, label: "종료" },
  draft: { variant: "default" as const, label: "준비중" },
};

const applicationStatusMap = {
  payment_pending: { variant: "warning" as const, label: "입금 대기" },
  paid_pending_approval: { variant: "info" as const, label: "승인 대기" },
  confirmed: { variant: "success" as const, label: "참가 확정" },
  waitlisted: { variant: "warning" as const, label: "대기 중" },
  expired: { variant: "default" as const, label: "만료됨" },
  cancelled: { variant: "danger" as const, label: "취소됨" },
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
    getDivisionApplicationCounts(id),
  ]);

  const teamApplication = teamApplicationResult.data;
  const counts = countsResult.data ?? {};

  const statusConfig =
    tournamentStatusMap[tournament.status] ?? tournamentStatusMap.draft;
  const appStatusConfig = teamApplication
    ? applicationStatusMap[teamApplication.status]
    : null;

  const applyHref = isLoggedIn ? `/tournament/${id}/apply` : "/login";
  const isResultVisible =
    tournament.status === "closed" || tournament.status === "finished";
  const canReapply =
    tournament.status === "open" &&
    (teamApplication?.status === "cancelled" ||
      teamApplication?.status === "expired");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* Hero */}
        <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* 포스터 카드: 이미지 + 상태/이름/기간/장소/부문 오버레이 */}
          <div className="relative overflow-hidden rounded-xl shadow-sm sm:col-span-2">
            {tournament.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tournament.poster_url}
                alt={tournament.name}
                className="block h-auto w-full"
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-600">
                <span className="text-5xl">🏀</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
              <Badge variant={statusConfig.variant} className="mb-2">
                {statusConfig.label}
              </Badge>
              <h1 className="mb-3 text-base font-bold leading-snug text-white sm:text-lg">
                {tournament.name}
              </h1>
              <dl className="space-y-1.5">
                <div className="flex items-baseline gap-2 text-xs">
                  <dt className="shrink-0 font-semibold uppercase tracking-wide text-white/50">기간</dt>
                  <dd className="text-white/80">
                    {tournament.start_date ?? "TBD"} – {tournament.end_date ?? "TBD"}
                  </dd>
                </div>
                <div className="flex items-baseline gap-2 text-xs">
                  <dt className="shrink-0 font-semibold uppercase tracking-wide text-white/50">장소</dt>
                  <dd className="text-white/80">{tournament.location ?? "미정"}</dd>
                </div>
                <div className="flex items-baseline gap-2 text-xs">
                  <dt className="shrink-0 font-semibold uppercase tracking-wide text-white/50">부문</dt>
                  <dd className="text-white/80">{divisions.length}개</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          {/* 메인 (2/3) */}
          <div className="flex flex-col gap-3 md:col-span-2">

            {/* 참가 부문 */}
            <Card>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                참가 부문
              </h2>
              {divisions.length === 0 ? (
                <p className="text-sm text-slate-400">부문 정보가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {divisions.map((division) => {
                    const count = counts[division.id] ?? 0;
                    const isMine = teamApplication?.division_id === division.id;
                    const isFull =
                      division.capacity !== null && count >= division.capacity;
                    return (
                      <div
                        key={division.id}
                        className={`rounded-xl border p-4 ${
                          isMine
                            ? "border-amber-300 bg-amber-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {division.name}
                          </span>
                          {isMine && (
                            <Badge variant="warning" className="shrink-0">
                              내 신청
                            </Badge>
                          )}
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                          <dt className="text-slate-400">참가비</dt>
                          <dd className="font-medium text-slate-700">
                            {division.entry_fee === 0
                              ? "무료"
                              : `${division.entry_fee.toLocaleString()}원`}
                          </dd>
                          <dt className="text-slate-400">정원</dt>
                          <dd className="font-medium text-slate-700">
                            {division.capacity === null
                              ? "무제한"
                              : `${division.capacity}팀`}
                          </dd>
                          <dt className="text-slate-400">신청 현황</dt>
                          <dd
                            className={`font-medium ${
                              isFull ? "text-rose-600" : "text-slate-700"
                            }`}
                          >
                            {count}팀
                            {division.capacity !== null &&
                              ` / ${division.capacity}팀`}
                            {isFull && " (마감)"}
                          </dd>
                        </dl>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            {/* 대회 소개 카드 (description 있을 때만) */}
            {tournament.description && (
              <Card className="sm:col-span-2">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  대회 소개
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {tournament.description}
                </p>
              </Card>
            )}
            
          </div>

          {/* 사이드바 (1/3) */}
          <div className="md:col-span-1">
            <div className="sticky top-6 flex flex-col gap-3">
              <Card>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  참가 안내
                </h2>

                {/* 내 신청 현황 */}
                {teamApplication && appStatusConfig ? (
                  <div className="mb-4 rounded-lg bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">내 신청</span>
                      <Badge variant={appStatusConfig.variant}>
                        {appStatusConfig.label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {teamApplication.team_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {teamApplication.division_name}
                    </p>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-slate-500">
                    {tournament.status === "open"
                      ? "아직 신청하지 않았습니다"
                      : isResultVisible
                      ? "참가 신청이 마감되었습니다"
                      : "대회 준비 중입니다"}
                  </p>
                )}

                {/* CTA 버튼 */}
                <div className="flex flex-col gap-2">
                  {tournament.status === "open" && !teamApplication && (
                    <Link href={applyHref} className="w-full">
                      <Button variant="primary" className="w-full">
                        팀 참가 신청
                      </Button>
                    </Link>
                  )}

                  {canReapply && (
                    <Link href={applyHref} className="w-full">
                      <Button variant="primary" className="w-full">
                        다시 신청하기
                      </Button>
                    </Link>
                  )}

                  {(teamApplication?.status === "payment_pending" ||
                    teamApplication?.status === "paid_pending_approval" ||
                    teamApplication?.status === "waitlisted") && (
                    <Link
                      href={`/my-applications/${teamApplication.id}`}
                      className="w-full"
                    >
                      <Button variant="secondary" className="w-full">
                        신청 현황 보기
                      </Button>
                    </Link>
                  )}

                  {teamApplication?.status === "confirmed" && (
                    <Link href="/team" className="w-full">
                      <Button variant="secondary" className="w-full">
                        내 팀 보기
                      </Button>
                    </Link>
                  )}

                  {tournament.status === "draft" && isOrganizer && (
                    <Link href={`/admin/tournaments/${id}`} className="w-full">
                      <Button variant="secondary" className="w-full">
                        관리하기
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
              {/* 결과 보기 배너 */}
              {isResultVisible && (
                <Card variant="highlight">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-amber-900">
                        대회 결과가 공개되었습니다
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        경기 결과 및 최종 순위를 확인하세요
                      </p>
                    </div>
                    <Link href={`/tournament/${id}/result`} className="shrink-0">
                      <Button variant="primary">이동</Button>
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          </div>
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
