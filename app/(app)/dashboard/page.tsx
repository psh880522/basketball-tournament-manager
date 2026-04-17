import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole, isUserRole } from "@/src/lib/auth/roles";
import { listMyTeams } from "@/lib/api/teams";
import { getUserTeamStatus } from "@/lib/api/team-applications";
import { listMyApplications } from "@/lib/api/applications";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TeamSection from "./TeamSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") redirect("/login");

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-red-600">Failed to load profile: {result.error}</p>
        </div>
      </main>
    );
  }

  if (result.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">No profile found for this account.</p>
        </div>
      </main>
    );
  }

  if (isOperationRole(result.role)) {
    redirect("/admin");
  }

  if (isUserRole(result.role)) {
    redirect("/onboarding/profile");
  }

  /* ── 내 팀 목록 + 팀 상태 + 최근 신청 병렬 조회 ── */
  const [teamsResult, teamStatusResult, appsResult] = await Promise.all([
    listMyTeams(),
    getUserTeamStatus(result.user!.id),
    listMyApplications(),
  ]);
  const teamStatus = teamStatusResult.data;
  const recentApps = (appsResult.data ?? []).slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">안녕하세요, {result.user?.email}</p>
        </header>

        {/* ── 온보딩 배너 ─────────────────────── */}
        {teamStatus === "no_team" && (
          <Card className="flex items-center justify-between gap-4 border-blue-200 bg-blue-50">
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">팀이 없습니다</p>
              <p className="text-xs text-blue-700">
                팀을 만들거나, 기존 팀에 합류 신청을 해보세요.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/teams/new">
                <Button variant="secondary">팀 만들기</Button>
              </Link>
              <Link href="/teams/find">
                <Button variant="secondary">팀 찾기</Button>
              </Link>
            </div>
          </Card>
        )}

        {teamStatus === "join_pending" && (
          <Card className="border-amber-200 bg-amber-50">
            <p className="text-sm font-medium text-amber-900">팀 합류 신청 중</p>
            <p className="text-xs text-amber-700 mt-1">
              팀 캡틴의 승인을 기다리고 있습니다.
            </p>
          </Card>
        )}

        {/* ── 내 팀 섹션 ──────────────────────── */}
        <TeamSection
          teams={teamsResult.data ?? []}
          fetchError={teamsResult.error}
        />

        {/* ── 최근 신청 현황 ──────────────────── */}
        {recentApps.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">최근 신청 현황</h2>
              <Link href="/my-applications" className="text-sm text-blue-600 hover:underline">
                전체 보기
              </Link>
            </div>
            <div className="space-y-2">
              {recentApps.map((app) => {
                const statusLabel: Record<string, string> = {
                  payment_pending: "입금 대기",
                  paid_pending_approval: "승인 대기",
                  confirmed: "참가 확정",
                  waitlisted: "대기자 명단",
                  cancelled: "취소됨",
                  expired: "만료됨",
                };
                const statusColor: Record<string, string> = {
                  payment_pending: "bg-amber-100 text-amber-700",
                  paid_pending_approval: "bg-blue-100 text-blue-700",
                  confirmed: "bg-green-100 text-green-700",
                  waitlisted: "bg-gray-100 text-gray-600",
                  cancelled: "bg-red-100 text-red-600",
                  expired: "bg-gray-100 text-gray-500",
                };
                return (
                  <Link key={app.id} href={`/my-applications/${app.id}`}>
                    <Card className="flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium">{app.tournament_name}</p>
                        <p className="text-xs text-gray-500">{app.team_name} · {app.division_name}</p>
                      </div>
                      <Badge className={statusColor[app.status] ?? "bg-gray-100 text-gray-600"}>
                        {statusLabel[app.status] ?? app.status}
                      </Badge>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 기타 카드 ──────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">대회 둘러보기</h2>
            <p className="text-sm text-gray-600">현재 진행 중인 대회를 확인하세요.</p>
            <Link href="/tournaments">
              <Button variant="secondary">대회 둘러보기</Button>
            </Link>
          </Card>
        </section>
      </div>
    </main>
  );
}
