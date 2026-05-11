import { redirect } from "next/navigation";
import { getUserWithRole, isUserRole } from "@/src/lib/auth/roles";
import { listMyManagedTeams } from "@/lib/api/teams";
import { getMyApplicationStatus, getMyTournamentApplicationsAsCaptain } from "@/lib/api/applications";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getTeamMembersForRoster } from "@/lib/api/rosters";
import { getProfileVerification } from "@/lib/api/profiles";
import ApplyTeamForm from "./Form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ division?: string }>;
};

export default async function TournamentApplyPage({ params, searchParams }: PageProps) {
  const { id: tournamentId } = await params;
  const { division: divisionId } = await searchParams;

  /* division 없으면 대회 상세로 돌려보냄 */
  if (!divisionId) {
    redirect(`/tournament/${tournamentId}`);
  }

  /* ── 인증 ──────────────────────────────────── */
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (isUserRole(userResult.role)) {
    redirect("/onboarding/profile");
  }

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-red-600">{userResult.error}</p>
        </div>
      </main>
    );
  }

  if (userResult.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-gray-600">프로필이 없습니다.</p>
        </div>
      </main>
    );
  }

  /* ── 본인인증 확인 ──────────────────────────── */
  const verificationResult = await getProfileVerification(userResult.user!.id);
  if (!verificationResult.data?.identity_verified_at) {
    const redirectTo = encodeURIComponent(`/tournament/${tournamentId}/apply?division=${divisionId}`);
    redirect(`/onboarding/identity?redirectTo=${redirectTo}`);
  }

  /* ── 대회 조회 ─────────────────────────────── */
  const tournamentResult = await getPublicTournamentById(tournamentId);

  if (tournamentResult.error || !tournamentResult.data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-red-600">
            {tournamentResult.error ?? "대회를 찾을 수 없습니다."}
          </p>
        </div>
      </main>
    );
  }

  const tournament = tournamentResult.data;

  /* ── 데이터 로드 ───────────────────────────── */
  const [teamsResult, appResult, divisionsResult, myAppsResult] = await Promise.all([
    listMyManagedTeams(),
    getMyApplicationStatus(tournamentId),
    getDivisionsByTournament(tournamentId),
    getMyTournamentApplicationsAsCaptain(tournamentId),
  ]);

  if (appResult.data) {
    redirect(`/my-applications/${appResult.data.id}`);
  }

  /* ── divisionId 유효성 확인 ────────────────── */
  const divisions = divisionsResult.data ?? [];
  const division = divisions.find((d) => d.id === divisionId);

  if (!division) {
    redirect(`/tournament/${tournamentId}`);
  }

  /* ── 팀별 멤버 목록 (로스터 미리보기용) ──────── */
  const managedTeams = teamsResult.data ?? [];
  const teamMembersMap: Record<string, Awaited<ReturnType<typeof getTeamMembersForRoster>>["data"]> = {};
  await Promise.all(
    managedTeams.map(async (t) => {
      const result = await getTeamMembersForRoster(t.team_id);
      teamMembersMap[t.team_id] = result.data ?? [];
    })
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <p className="text-sm text-gray-600">대회 참가 신청</p>
        </header>

        {teamsResult.error && (
          <p className="text-sm text-red-600">
            팀 목록을 불러오지 못했습니다: {teamsResult.error}
          </p>
        )}

        {appResult.error && (
          <p className="text-sm text-red-600">
            신청 현황을 불러오지 못했습니다: {appResult.error}
          </p>
        )}

        <ApplyTeamForm
          tournamentId={tournamentId}
          tournamentStartDate={tournament.start_date ?? null}
          managedTeams={managedTeams}
          division={division}
          myActiveApps={myAppsResult.data ?? []}
          teamMembersMap={teamMembersMap}
        />
      </div>
    </main>
  );
}
