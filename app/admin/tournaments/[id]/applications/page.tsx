export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listTournamentApplications } from "@/lib/api/applications";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import Card from "@/components/ui/Card";
import ApplicationList from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminApplicationsPage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Card className="text-sm text-red-600">
            {userResult.error ?? "사용자 정보를 불러오지 못했습니다."}
          </Card>
        </div>
      </main>
    );
  }

  if (userResult.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Card className="text-sm text-gray-600">프로필이 없습니다.</Card>
        </div>
      </main>
    );
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id: tournamentId } = await params;
  const [{ data: applications, error }, divisionsResult] = await Promise.all([
    listTournamentApplications(tournamentId),
    getDivisionsByTournament(tournamentId),
  ]);

  const divisions = (divisionsResult.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/tournaments/${tournamentId}`}
            className="text-sm text-gray-500"
          >
            ← 대회 대시보드
          </Link>
        </div>

        <h1 className="text-2xl font-semibold">참가 신청 관리</h1>

        {error ? (
          <Card className="text-sm text-red-600">{error}</Card>
        ) : (
          <ApplicationList
            applications={applications}
            tournamentId={tournamentId}
            divisions={divisions}
          />
        )}
      </div>
    </main>
  );
}
