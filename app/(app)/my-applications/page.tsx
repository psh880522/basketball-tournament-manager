import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { listMyApplications } from "@/lib/api/applications";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  payment_pending: "입금 대기",
  paid_pending_approval: "입금 확인 중",
  confirmed: "참가 확정",
  waitlisted: "대기자 명단",
  cancelled: "취소됨",
  expired: "만료됨",
};

const STATUS_COLOR: Record<string, string> = {
  payment_pending: "bg-amber-100 text-amber-700",
  paid_pending_approval: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  waitlisted: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-500",
};

export default async function MyApplicationsPage() {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated" || result.status === "empty") {
    redirect("/login");
  }

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </main>
    );
  }

  if (isUserRole(result.role)) redirect("/onboarding/profile");
  if (!isPlayerRole(result.role)) redirect("/");

  const appsResult = await listMyApplications();
  const apps = appsResult.data ?? [];

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">내 신청 현황</h1>
          <p className="text-sm text-slate-500">내가 주장인 팀의 대회 신청 내역입니다.</p>
        </header>

        {appsResult.error && (
          <p className="text-sm text-red-600">신청 목록을 불러오지 못했습니다: {appsResult.error}</p>
        )}

        {!appsResult.error && apps.length === 0 && (
          <Card className="py-8 text-center">
            <p className="text-sm text-gray-500">아직 대회 신청 내역이 없습니다.</p>
          </Card>
        )}

        <div className="space-y-3">
          {apps.map((app) => {
            const isLocked =
              app.tournament_start_date !== null && app.tournament_start_date <= today;
            const isInactive =
              app.status === "cancelled" || app.status === "expired";

            return (
              <Link key={app.id} href={`/my-applications/${app.id}`}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {app.tournament_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {app.division_name} · {app.team_name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={STATUS_COLOR[app.status] ?? "bg-gray-100 text-gray-600"}>
                          {STATUS_LABEL[app.status] ?? app.status}
                        </Badge>
                        {!isInactive && (
                          <span className="text-xs text-slate-400">
                            {app.has_roster
                              ? `로스터 ${app.roster_member_count}명 등록됨`
                              : "로스터 없음"}
                          </span>
                        )}
                        {!isInactive && (
                          <span className="text-xs text-slate-400">
                            {isLocked ? "잠금" : "편집 가능"}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
