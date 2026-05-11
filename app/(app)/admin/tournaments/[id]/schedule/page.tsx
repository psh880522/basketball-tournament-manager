import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import { getCourtsByTournament } from "@/lib/api/courts";
import {
  getScheduleSlotsFlatByCourt,
} from "@/lib/api/schedule-slots";
import { getTournamentForEdit } from "@/lib/api/tournaments";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ScheduleSlotsFlatBoard from "./components/ScheduleSlotsFlatBoard";
import ScheduleGenerateActions from "./components/ScheduleGenerateActions";
import ScheduleSyncActions from "./components/ScheduleSyncActions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SchedulePage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
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
        <div className="mx-auto max-w-4xl space-y-4">
          <h1 className="text-2xl font-semibold">스케줄 관리</h1>
          <Card className="text-sm text-gray-600">프로필이 없습니다.</Card>
        </div>
      </main>
    );
  }

  const { id } = await params;

  if (!isOperationRole(userResult.role)) redirect("/dashboard");

  const isOrganizer = userResult.role === "organizer";

  const [courtsResult, flatSlotsResult, tournamentResult, divisionsResult] =
    await Promise.all([
      getCourtsByTournament(id),
      getScheduleSlotsFlatByCourt(id),
      getTournamentForEdit(id),
      getDivisionsByTournament(id),
    ]);

  const courts = courtsResult.data ?? [];
  const scheduleStartAt = tournamentResult.data?.schedule_start_at ?? null;
  const divisions = (divisionsResult.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">스케줄 관리</h1>
            <p className="text-sm text-gray-600">스케줄 을 확인하세요.</p>
          </div>
          {isOrganizer && (
            <Link href={`/admin/tournaments/${id}/edit`}>
              <Button variant="secondary">대회 수정</Button>
            </Link>
          )}
        </header>

        {isOrganizer && (
          <section className="space-y-3">
            <ScheduleGenerateActions
              tournamentId={id}
              scheduleStartAt={scheduleStartAt}
              courts={courts}
              divisions={divisions}
            />
            <ScheduleSyncActions tournamentId={id} />
          </section>
        )}

        <section className="space-y-3">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">스케줄 조회</h2>
            <p className="text-sm text-gray-500">코트 및 디비전별 슬롯을 확인하고 순서·소요시간·코트를 직접 편집합니다.</p>
            <ScheduleSlotsFlatBoard
              groups={flatSlotsResult.data ?? []}
              courts={courts}
              tournamentId={id}
              scheduleStartAt={scheduleStartAt}
              isEditable={isOrganizer}
            />
          </Card>
        </section>
      </div>
    </main>
  );
}
