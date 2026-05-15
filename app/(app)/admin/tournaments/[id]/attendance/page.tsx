export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTeamsWithAttendance } from "@/lib/api/attendance";
import { getTournamentForEdit } from "@/lib/api/tournaments";
import Card from "@/components/ui/Card";
import AttendanceTable from "./AttendanceTable";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AttendancePage({ params }: PageProps) {
  const userResult = await getUserWithRole();

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

  const [teamsResult, tournamentResult] = await Promise.all([
    getTeamsWithAttendance(tournamentId),
    getTournamentForEdit(tournamentId),
  ]);

  const isFinished = tournamentResult.data?.status === "finished";

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

        <h1 className="text-2xl font-semibold">참가팀 출석 체크</h1>

        {teamsResult.error ? (
          <Card className="text-sm text-red-600">{teamsResult.error}</Card>
        ) : (
          <AttendanceTable
            teams={teamsResult.data ?? []}
            tournamentId={tournamentId}
            isFinished={isFinished}
          />
        )}
      </div>
    </main>
  );
}
