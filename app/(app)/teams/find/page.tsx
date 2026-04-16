import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { getTeamsForJoin, getUserTeamStatus } from "@/lib/api/team-applications";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import SearchSection from "./SearchSection";

export const dynamic = "force-dynamic";

export default async function TeamsFindPage() {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated" || result.status === "empty") {
    redirect("/login");
  }

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </main>
    );
  }

  if (isUserRole(result.role)) redirect("/onboarding/profile");
  if (!isPlayerRole(result.role)) redirect("/");

  const userId = result.user!.id;

  // 팀 목록 + 내 신청 중인 팀 ID 병렬 조회
  const [teamsResult] = await Promise.all([
    getTeamsForJoin(userId),
  ]);

  // 현재 신청 중인 팀 ID 목록 조회
  const supabase = await createSupabaseServerClient();
  const { data: myApps } = await supabase
    .from("team_join_applications")
    .select("team_id")
    .eq("applicant_id", userId)
    .eq("status", "pending");

  const pendingTeamIds = (myApps ?? []).map((row) => row.team_id as string);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">팀 찾기</h1>
          <p className="text-sm text-slate-500">
            합류하고 싶은 팀에 신청하세요.
          </p>
        </header>

        {teamsResult.error && (
          <p className="text-sm text-red-600">
            팀 목록을 불러오지 못했습니다: {teamsResult.error}
          </p>
        )}

        <SearchSection
          teams={teamsResult.data ?? []}
          pendingTeamIds={pendingTeamIds}
        />
      </div>
    </main>
  );
}
