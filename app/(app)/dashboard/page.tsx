import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole, isUserRole } from "@/src/lib/auth/roles";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { listMyTeams } from "@/lib/api/teams";
import { getUserTeamStatus } from "@/lib/api/team-applications";
import { listAllMyTeamApplications } from "@/lib/api/applications";
import { getMyDashboardSummary, getMyPendingActions } from "@/lib/api/dashboard";
import { getMyUpcomingMatches, getMyRecentResults } from "@/lib/api/matches";
import type { MyTeamWithApplications, UpcomingMatch } from "@/lib/types/dashboard";

import EmptyDashboard from "./EmptyDashboard";
import SummaryCards from "./SummaryCards";
import ActionItems from "./ActionItems";
import UpcomingMatches from "./UpcomingMatches";
import MyTeamsGrid from "./MyTeamsGrid";
import RecentResults from "./RecentResults";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const result = await getUserWithRole();

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-page px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-red-600">프로필 로드 실패: {result.error}</p>
        </div>
      </main>
    );
  }

  if (result.status === "empty") {
    return (
      <main className="min-h-screen bg-page px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-500">프로필을 찾을 수 없습니다.</p>
        </div>
      </main>
    );
  }

  if (isOperationRole(result.role)) redirect("/admin");
  if (isUserRole(result.role)) redirect("/onboarding/profile");

  const userId = result.user!.id;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();
  const displayName = (profile?.display_name as string | null) ?? result.user?.email ?? "";

  const [
    teamsResult,
    teamStatusResult,
    actionsResult,
    upcomingResult,
    applicationsResult,
    recentResult,
  ] = await Promise.all([
    listMyTeams(),
    getUserTeamStatus(userId),
    getMyPendingActions(),
    getMyUpcomingMatches(),
    listAllMyTeamApplications(),
    getMyRecentResults(),
  ]);

  const pendingActions = actionsResult.data ?? [];
  const summaryResult = await getMyDashboardSummary(pendingActions.length);

  const teams = teamsResult.data ?? [];
  const teamStatus = teamStatusResult.data;
  const applications = applicationsResult.data ?? [];
  const upcomingMatches = upcomingResult.data ?? [];

  /* ── 빈 상태 분기 ── */
  if (teams.length === 0) {
    return (
      <main className="min-h-screen bg-page px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <DashboardHeader name={displayName} />
          <EmptyDashboard
            state="no_team"
            pendingJoin={teamStatus === "join_pending"}
          />
        </div>
      </main>
    );
  }

  // 신청 status가 유효하고, 대회 자체도 종료되지 않은 경우만 활성으로 간주
  const isActiveApp = (a: (typeof applications)[0]) =>
    a.status !== "cancelled" &&
    a.status !== "expired" &&
    a.tournament_status !== "finished";

  const hasActiveApps = applications.some(isActiveApp);

  if (!hasActiveApps && pendingActions.length === 0) {
    return (
      <main className="min-h-screen bg-page px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <DashboardHeader name={displayName} />
          <EmptyDashboard state="no_app" teams={teams} />
        </div>
      </main>
    );
  }

  /* ── MyTeamWithApplications 조합 ── */
  const upcomingByTeam = new Map<string, UpcomingMatch>();
  for (const match of upcomingMatches) {
    if (!upcomingByTeam.has(match.myTeamId)) {
      upcomingByTeam.set(match.myTeamId, match);
    }
  }

  const teamsWithApps: MyTeamWithApplications[] = teams.map((team) => {
    const teamApps = applications
      .filter((a) => a.team_id === team.team_id && isActiveApp(a))
      .map((a) => ({
        applicationId: a.id,
        tournamentId: a.tournament_id,
        tournamentName: a.tournament_name,
        divisionName: a.division_name,
        status: a.status,
        nextMatch: upcomingByTeam.get(team.team_id) ?? null,
      }));

    return {
      teamId: team.team_id,
      teamName: team.team_name,
      roleInTeam: team.role_in_team as "captain" | "player",
      activeApplications: teamApps,
    };
  });

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <DashboardHeader name={displayName} />

        {summaryResult.data && (
          <SummaryCards summary={summaryResult.data} />
        )}

        <ActionItems actions={pendingActions} />

        <UpcomingMatches matches={upcomingMatches} />

        <MyTeamsGrid teams={teamsWithApps} />

        <RecentResults results={recentResult.data ?? []} />
      </div>
    </main>
  );
}

function DashboardHeader({ name }: { name: string }) {
  return (
    <header className="space-y-0.5">
      <h1 className="text-2xl font-semibold text-slate-800">내 허브</h1>
      <p className="text-sm text-slate-500">안녕하세요, {name}님</p>
    </header>
  );
}
