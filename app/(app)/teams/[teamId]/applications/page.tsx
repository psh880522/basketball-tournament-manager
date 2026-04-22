import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getMyRoleInTeam } from "@/lib/api/teams";
import { getTeamApplicationsForCaptain } from "@/lib/api/team-applications";
import ApplicationCard from "./ApplicationCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamApplicationsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const auth = await getUserWithRole();
  if (auth.status === "empty") {
    redirect("/login");
  }

  if (auth.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">{auth.error}</p>
        </div>
      </main>
    );
  }

  // 캡틴 권한 확인
  const roleResult = await getMyRoleInTeam(teamId);
  if (roleResult.error || roleResult.role !== "captain") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">
            이 팀의 캡틴만 합류 신청을 관리할 수 있습니다.
          </p>
        </div>
      </main>
    );
  }

  const appsResult = await getTeamApplicationsForCaptain(teamId);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">합류 신청 관리</h1>
          <p className="text-sm text-slate-500">
            대기 중인 합류 신청을 승인하거나 거절하세요.
          </p>
        </header>

        {appsResult.error && (
          <p className="text-sm text-red-600">
            신청 목록을 불러오지 못했습니다: {appsResult.error}
          </p>
        )}

        {!appsResult.error && (appsResult.data ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            대기 중인 합류 신청이 없습니다.
          </p>
        )}

        <div className="space-y-3">
          {(appsResult.data ?? []).map((app) => (
            <ApplicationCard key={app.id} application={app} teamId={teamId} />
          ))}
        </div>
      </div>
    </main>
  );
}
