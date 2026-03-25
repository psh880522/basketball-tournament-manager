import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCourtsByTournament } from "@/lib/api/courts";
import {
  getScheduleSlots,
  getScheduleSlotsFlatByCourt,
} from "@/lib/api/schedule-slots";
import { getStandingsByDivision } from "@/lib/api/standings";
import { getTournamentForEdit } from "@/lib/api/tournaments";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ScheduleSlotsBoard from "./components/ScheduleSlotsBoard";
import ScheduleSlotsFlatBoard from "./components/ScheduleSlotsFlatBoard";
import ScheduleGenerateActions from "./components/ScheduleGenerateActions";
import ScheduleSyncActions from "./components/ScheduleSyncActions";

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

  const { id } = await params;

  const buildDivisionRanks = async (
    slotBoard: Awaited<ReturnType<typeof getScheduleSlots>>
  ) => {
    const divisionIds = new Set<string>();
    (slotBoard.data ?? []).forEach((courtGroup) => {
      courtGroup.divisions.forEach((divisionGroup) => {
        if (divisionGroup.division?.id) {
          divisionIds.add(divisionGroup.division.id);
        }
      });
    });

    const standingsResults = await Promise.all(
      [...divisionIds].map(async (divisionId) => ({
        divisionId,
        result: await getStandingsByDivision(divisionId),
      }))
    );

    const ranks: Record<string, Record<string, number>> = {};
    standingsResults.forEach(({ divisionId, result }) => {
      if (!result.data) return;
      const map: Record<string, number> = {};
      result.data.forEach((row) => {
        if (row.team_id && row.rank) {
          map[row.team_id] = row.rank;
        }
      });
      ranks[divisionId] = map;
    });

    return ranks;
  };

  if (userResult.role !== "organizer") {
    const [courtsResult, slotBoard] = await Promise.all([
      getCourtsByTournament(id),
      getScheduleSlots(id),
    ]);
    const divisionRanks = await buildDivisionRanks(slotBoard);

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">스케줄 관리</h1>
              <p className="text-sm text-gray-600">스케줄 을 확인하세요.</p>
            </div>
          </header>

          <section className="space-y-3">
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">스케줄 조회</h2>
              <p className="text-sm text-gray-500">코트 및 디비전별 경기 일정을 확인합니다.</p>
              <ScheduleSlotsBoard
                slots={slotBoard.data}
                error={slotBoard.error}
                courts={courtsResult.data ?? []}
                tournamentId={id}
                divisionRanks={divisionRanks}
                isEditable={false}
              />
            </Card>
          </section>
        </div>
      </main>
    );
  }

  const [courtsResult, slotBoard, flatSlotsResult, tournamentResult, divisionsResult] =
    await Promise.all([
      getCourtsByTournament(id),
      getScheduleSlots(id),
      getScheduleSlotsFlatByCourt(id),
      getTournamentForEdit(id),
      getDivisionsByTournament(id),
    ]);
  const divisionRanks = await buildDivisionRanks(slotBoard);

  const courts = courtsResult.data ?? [];
  const scheduleStartAt = tournamentResult.data?.schedule_start_at ?? null;
  const divisions = (divisionsResult.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">스케줄 관리</h1>
            <p className="text-sm text-gray-600">스케줄 을 확인하세요.</p>
          </div>
          <Link href={`/admin/tournaments/${id}/edit`}>
            <Button variant="secondary">대회 수정</Button>
          </Link>
        </header>

        <section className="space-y-3">
          <ScheduleGenerateActions
            tournamentId={id}
            scheduleStartAt={scheduleStartAt}
            courts={courts}
            divisions={divisions}
          />
          <ScheduleSyncActions tournamentId={id} />
        </section>

        <section className="space-y-3">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">스케줄 조회</h2>
            <p className="text-sm text-gray-500">코트 및 디비전별 슬롯을 확인하고 순서·소요시간·코트를 직접 편집합니다.</p>
            <ScheduleSlotsFlatBoard
              groups={flatSlotsResult.data ?? []}
              courts={courts}
              tournamentId={id}
              scheduleStartAt={scheduleStartAt}
              isEditable
            />
          </Card>
        </section>
      </div>
    </main>
  );
}
