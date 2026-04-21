import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { listMyTeams } from "@/lib/api/teams";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyTeamsPage() {
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

  const teamsResult = await listMyTeams();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">내 팀 목록</h1>
            <p className="text-sm text-slate-500">소속된 팀 전체를 확인합니다.</p>
          </div>
          <Link href="/teams/new">
            <Button variant="secondary">+ 새 팀 만들기</Button>
          </Link>
        </header>

        {teamsResult.error && (
          <p className="text-sm text-red-600">팀 목록을 불러오지 못했습니다: {teamsResult.error}</p>
        )}

        {!teamsResult.error && (teamsResult.data ?? []).length === 0 && (
          <Card className="space-y-4 text-center py-8">
            <p className="text-sm text-gray-600">아직 소속된 팀이 없습니다.</p>
            <div className="flex justify-center gap-3">
              <Link href="/teams/new">
                <Button>팀 만들기</Button>
              </Link>
              <Link href="/teams/find">
                <Button variant="secondary">팀 찾기</Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {(teamsResult.data ?? []).map((team) => (
            <Link key={team.team_id} href={`/teams/${team.team_id}`}>
              <Card className="flex items-center justify-between hover:bg-white transition-colors cursor-pointer">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{team.team_name}</span>
                    <Badge
                      className={
                        team.role_in_team === "captain"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {team.role_in_team === "captain" ? "주장" : "선수"}
                    </Badge>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
