import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import { getScheduleMatches } from "@/lib/api/schedule";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ScheduleForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SchedulePage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">스케줄 관리</h1>
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
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">스케줄 관리</h1>
          <Card className="text-sm text-gray-600">프로필이 없습니다.</Card>
        </div>
      </main>
    );
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;

  const [matchesResult, divisionsResult, courtsResult] = await Promise.all([
    getScheduleMatches(id),
    getDivisionsByTournament(id),
    getCourtsByTournament(id),
  ]);

  if (matchesResult.error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">스케줄 관리</h1>
          <Card className="text-sm text-red-600">
            데이터를 불러오지 못했습니다: {matchesResult.error}
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">스케줄 관리</h1>
            <p className="text-sm text-gray-600">
              경기 시간과 코트를 배정하세요.
            </p>
          </div>
          <Link href={`/admin/tournaments/${id}/edit`}>
            <Button variant="secondary">대회 수정</Button>
          </Link>
        </header>

        <ScheduleForm
          tournamentId={id}
          initialMatches={matchesResult.data ?? []}
          divisions={divisionsResult.data ?? []}
          courts={courtsResult.data ?? []}
        />
      </div>
    </main>
  );
}
