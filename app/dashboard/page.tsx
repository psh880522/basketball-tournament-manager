import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import { listMyTeams } from "@/lib/api/teams";
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

  /* ── 내 팀 목록 조회 ─────────────────────────── */
  const teamsResult = await listMyTeams();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">안녕하세요, {result.user?.email}</p>
        </header>

        {/* ── 내 팀 섹션 ──────────────────────── */}
        <TeamSection
          teams={teamsResult.data ?? []}
          fetchError={teamsResult.error}
        />

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
