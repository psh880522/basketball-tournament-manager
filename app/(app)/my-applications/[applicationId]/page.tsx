import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { getApplicationById, ACTIVE_STATUSES } from "@/lib/api/applications";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { getMyRoleInTeam } from "@/lib/api/teams";
import {
  getOrCreateRoster,
  getRosterByApplication,
  getRosterWithMembers,
  getTeamMembersForRoster,
} from "@/lib/api/rosters";
import ApplicationStatusSection from "./ApplicationStatusSection";
import RosterSection from "./RosterSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  /* ── 인증 ──────────────────────────────────── */
  const auth = await getUserWithRole();
  if (auth.status === "unauthenticated" || auth.status === "empty") {
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
  if (isUserRole(auth.role)) redirect("/onboarding/profile");
  if (!isPlayerRole(auth.role)) redirect("/");

  /* ── 신청 조회 ─────────────────────────────── */
  const appResult = await getApplicationById(applicationId);
  if (appResult.error || !appResult.data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">
            {appResult.error ?? "신청 정보를 찾을 수 없습니다."}
          </p>
        </div>
      </main>
    );
  }
  const app = appResult.data;

  /* ── 팀 역할 + 대회 정보 병렬 조회 ─────────── */
  const [roleResult, tournamentResult] = await Promise.all([
    getMyRoleInTeam(app.team_id),
    getPublicTournamentById(app.tournament_id),
  ]);

  if (roleResult.error || !roleResult.role) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">
            {roleResult.error ?? "이 신청에 접근할 권한이 없습니다."}
          </p>
        </div>
      </main>
    );
  }

  const isCaptain = roleResult.role === "captain";
  const tournamentName = tournamentResult.data?.name ?? "";
  const tournamentStartDate = tournamentResult.data?.start_date ?? null;

  const today = new Date().toISOString().split("T")[0];
  const isRosterLocked =
    tournamentStartDate !== null && tournamentStartDate <= today;

  /* ── 로스터 조회/생성 ────────────────────────── */
  const isActive = (ACTIVE_STATUSES as string[]).includes(app.status);
  const isInactive = app.status === "cancelled" || app.status === "expired";

  let rosterId: string | null = null;
  let rosterWithMembers = null;
  let teamMembers: Awaited<ReturnType<typeof getTeamMembersForRoster>>["data"] = [];

  if (isActive) {
    if (isCaptain) {
      // captain: 없으면 자동 생성
      const rosterResult = await getOrCreateRoster(applicationId);
      if (rosterResult.data) {
        rosterId = rosterResult.data.id;
        const [rwmResult, tmResult] = await Promise.all([
          getRosterWithMembers(rosterId),
          getTeamMembersForRoster(app.team_id),
        ]);
        rosterWithMembers = rwmResult.data ?? null;
        teamMembers = tmResult.data ?? [];
      }
    } else {
      // 일반 팀원: 기존 로스터만 조회
      const existingRoster = await getRosterByApplication(applicationId);
      if (existingRoster.data) {
        rosterId = existingRoster.data.id;
        const rwmResult = await getRosterWithMembers(rosterId);
        rosterWithMembers = rwmResult.data ?? null;
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">{tournamentName}</h1>
          <p className="text-sm text-slate-500">
            {app.division_name} · {app.team_name}
          </p>
        </header>

        {/* ── 신청 현황 섹션 ─────────────────────── */}
        <ApplicationStatusSection
          app={app}
          tournamentId={app.tournament_id}
          isCaptain={isCaptain}
        />

        {/* ── 로스터 섹션 ─────────────────────────── */}
        {isInactive ? (
          <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600">
            신청이 취소 또는 만료되었습니다.
          </div>
        ) : isActive ? (
          <RosterSection
            applicationId={applicationId}
            rosterId={rosterId}
            rosterWithMembers={rosterWithMembers}
            teamMembers={teamMembers ?? []}
            isCaptain={isCaptain}
            isLocked={isRosterLocked}
          />
        ) : null}
      </div>
    </main>
  );
}
