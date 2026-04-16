import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTeam, getMyRoleInTeam } from "@/lib/api/teams";
import { getPlayersByTeam } from "@/lib/api/players";
import Badge from "@/components/ui/Badge";
import { PlayerList } from "./Form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  /* ── 인증 ──────────────────────────────────── */
  const auth = await getUserWithRole();
  if (auth.status === "unauthenticated") redirect("/login");

  if (auth.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-red-600">프로필을 불러올 수 없습니다: {auth.error}</p>
        </div>
      </main>
    );
  }

  /* ── 팀 멤버 권한 확인 ─────────────────────── */
  const roleResult = await getMyRoleInTeam(teamId);

  if (roleResult.error || !roleResult.role) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-red-600">
            {roleResult.error ?? "이 팀에 접근할 권한이 없습니다."}
          </p>
        </div>
      </main>
    );
  }

  const isManager = roleResult.role === "captain";

  /* ── 데이터 로드 ───────────────────────────── */
  const [teamResult, playersResult] = await Promise.all([
    getTeam(teamId),
    getPlayersByTeam(teamId),
  ]);

  if (teamResult.error || !teamResult.data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-red-600">
            팀 정보를 불러올 수 없습니다: {teamResult.error ?? "팀을 찾을 수 없습니다."}
          </p>
        </div>
      </main>
    );
  }

  if (playersResult.error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-red-600">
            선수 목록을 불러올 수 없습니다: {playersResult.error}
          </p>
        </div>
      </main>
    );
  }

  const team = teamResult.data;
  const players = playersResult.data ?? [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/* ── Team Header ───────────────────── */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{team.team_name}</h1>
            <Badge
              className={
                isManager
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }
            >
              {isManager ? "주장" : "선수"}
            </Badge>
          </div>
          {team.contact && (
            <p className="text-sm text-gray-600">연락처: {team.contact}</p>
          )}
        </header>

        {/* ── Players Section ───────────────── */}
        <PlayerList
          teamId={teamId}
          players={players}
          isManager={isManager}
        />
      </div>
    </main>
  );
}
