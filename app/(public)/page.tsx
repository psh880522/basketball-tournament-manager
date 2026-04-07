import Link from "next/link";
import { Suspense } from "react";
import { getUserWithRole, isPlayerRole, isUserRole, isOperationRole } from "@/src/lib/auth/roles";
import { getInProgressTournaments, getOpenTournaments } from "@/lib/api/tournaments";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Role } from "@/src/lib/auth/roles";

const formatDateRange = (start: string | null, end: string | null) => {
  const startLabel = start || "TBD";
  const endLabel = end || "TBD";
  return `${startLabel} - ${endLabel}`;
};

async function OpenTournamentsList({ role }: { role: Role | null }) {
  const { data, error } = await getOpenTournaments();

  if (error) {
    return <p className="text-sm text-red-600">대회 정보를 불러오지 못했습니다.</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-600">현재 모집 중인 대회가 없습니다.</p>;
  }

  return (
    <div className="grid gap-4">
      {data.map((tournament) => (
        <Card key={tournament.id} className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/tournament/${tournament.id}`} className="font-semibold">
              {tournament.name}
            </Link>
            <Badge className="bg-emerald-100 text-emerald-700">모집 중</Badge>
          </div>
          <p className="text-sm text-gray-600">
            일정: {formatDateRange(tournament.start_date, tournament.end_date)}
          </p>
          <p className="text-sm text-gray-600">장소: {tournament.location || "TBD"}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/tournament/${tournament.id}`}>
              <Button variant="secondary">상세보기</Button>
            </Link>
            {isPlayerRole(role) ? (
              <Link href={`/tournament/${tournament.id}/apply`}>
                <Button>참가 신청</Button>
              </Link>
            ) : isUserRole(role) ? (
              <Link href="/onboarding/profile" title="선수 등록 후 신청 가능">
                <Button variant="secondary">선수 등록 후 신청</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>참가 신청</Button>
              </Link>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

async function InProgressTournamentsList() {
  const { data, error } = await getInProgressTournaments();

  if (error) {
    return (
      <p className="text-sm text-red-600">
        진행 중 대회 정보를 불러오지 못했습니다.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-600">현재 진행 중인 대회가 없습니다.</p>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map((tournament) => (
        <Card key={tournament.id} className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/tournament/${tournament.id}`} className="font-semibold">
              {tournament.name}
            </Link>
            <Badge className="bg-amber-100 text-amber-700">진행 중</Badge>
          </div>
          <p className="text-sm text-gray-600">
            일정: {formatDateRange(tournament.start_date, tournament.end_date)}
          </p>
          <p className="text-sm text-gray-600">장소: {tournament.location || "TBD"}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/tournament/${tournament.id}`}>
              <Button variant="secondary">대회 보기</Button>
            </Link>
            <Link href={`/tournament/${tournament.id}/result`}>
              <Button variant="ghost">현황/결과</Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const userResult = await getUserWithRole();
  const isLoggedIn = userResult.status === "ready";
  const role = userResult.role;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        {/* 히어로 섹션 */}
        <section className="space-y-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">
              농심 3X3 농구대회에 오신 것을 환영합니다!
            </h1>
            <p className="text-sm text-gray-600">
              대회를 살펴보고 참가해보세요!
            </p>
            {!isLoggedIn ? (
              <Link href="/login" className="inline-block">
                <Button>대회 참여하기</Button>
              </Link>
            ) : isUserRole(role) ? (
              <Link href="/onboarding/profile" className="inline-block">
                <Button>선수 등록하기</Button>
              </Link>
            ) : isPlayerRole(role) ? (
              <Link href="/dashboard" className="inline-block">
                <Button>대시보드 가기</Button>
              </Link>
            ) : isOperationRole(role) ? (
              <Link href="/admin" className="inline-block">
                <Button>관리자 페이지</Button>
              </Link>
            ) : null}
          </div>
        </section>

        {/* user 전용 선수 등록 안내 카드 */}
        {isUserRole(role) && (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-blue-900">
              선수로 참가하려면 등록이 필요합니다
            </h2>
            <p className="text-sm text-blue-700">
              이름, 연락처 등 기본 정보를 입력하고 본인인증을 완료하면
              대회에 참가 신청할 수 있습니다.
            </p>
            <Link href="/onboarding/profile" className="inline-block">
              <Button>지금 선수 등록하기</Button>
            </Link>
          </section>
        )}

        <section id="open-tournaments" className="space-y-4">
          <h2 className="text-lg font-semibold">현재 모집 중인 대회</h2>
          <Suspense
            fallback={<p className="text-sm text-gray-600">대회 목록을 불러오는 중...</p>}
          >
            <OpenTournamentsList role={role} />
          </Suspense>
        </section>

        <section id="in-progress-tournaments" className="space-y-4">
          <h2 className="text-lg font-semibold">현재 진행 중인 대회</h2>
          <Suspense
            fallback={
              <p className="text-sm text-gray-600">진행 중인 대회를 불러오는 중...</p>
            }
          >
            <InProgressTournamentsList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
