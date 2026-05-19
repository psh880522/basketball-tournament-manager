import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTournamentBracketMatches, listTournamentMatches } from "@/lib/api/matches";
import {
  getDivisionsWithGroups,
  listStandingsPageData,
} from "@/lib/api/standings";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { getCourtsByTournament } from "@/lib/api/courts";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { getTournamentStatusDisplay } from "@/lib/utils/tournament";
import ChampionBanner from "./components/ChampionBanner";
import ResultTabs from "./components/ResultTabs";
import type { StandingSection } from "./components/ResultTabs";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "일정 미정";
  if (!end) return start!;
  if (!start) return end;
  return `${start} ~ ${end}`;
}

async function ResultContent({ tournamentId }: { tournamentId: string }) {
  const [tournamentResult, bracketResult, matchesResult, courtsResult, divisionsResult, standingsPageResult, userResult] =
    await Promise.all([
      getPublicTournamentById(tournamentId),
      getTournamentBracketMatches(tournamentId),
      listTournamentMatches(tournamentId),
      getCourtsByTournament(tournamentId),
      getDivisionsWithGroups(tournamentId),
      listStandingsPageData(tournamentId),
      getUserWithRole(),
    ]);

  if (tournamentResult.error || !tournamentResult.data) {
    return (
      <p className="text-sm text-gray-500">
        {tournamentResult.error
          ? "대회 정보를 불러오지 못했습니다."
          : "존재하지 않는 대회입니다."}
      </p>
    );
  }

  const tournament = tournamentResult.data;
  const isOrganizer =
    userResult.status === "ready" && userResult.role === "organizer";
  const isPublicVisible =
    tournament.status === "closed" || tournament.status === "finished";

  if (!isOrganizer && !isPublicVisible) {
    return (
      <p className="text-sm text-gray-500">
        결과는 종료된 대회에서만 확인할 수 있습니다.
      </p>
    );
  }

  if (bracketResult.error || matchesResult.error || divisionsResult.error || standingsPageResult.error) {
    return (
      <p className="text-sm text-red-500">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  const bracketMatches = bracketResult.data ?? [];
  const allMatches = matchesResult.data ?? [];
  const courts = (courtsResult.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  const divisions = divisionsResult.data ?? [];
  const hasMultipleDivisions = divisions.length > 1;
  const divisionsSimple = divisions.map((d) => ({ id: d.id, name: d.name }));

  // ── Standings sections: division-level (group_id = null) ────────────────
  const allStandings = standingsPageResult.data?.standings ?? [];
  const standingSections: StandingSection[] = divisions
    .map((div) => ({
      divisionId: div.id,
      divisionName: div.name,
      standings: allStandings
        .filter((row) => row.division_id === div.id)
        .sort((a, b) => a.rank - b.rank),
    }))
    .filter((s) => s.standings.length > 0);

  // ── Champion per division (1~3위) ─────────────────────────────────────────
  const champions = divisions.map((div) => {
    const finalMatch = bracketMatches.find(
      (m) => m.division_id === div.id && m.group?.name === "final"
    );
    const thirdMatch = bracketMatches.find(
      (m) => m.division_id === div.id && m.group?.name === "third_place"
    );

    let first: string | null = null;
    let second: string | null = null;
    let third: string | null = null;

    if (finalMatch?.status === "completed" && finalMatch.winner_team_id) {
      if (finalMatch.winner_team_id === finalMatch.team_a?.id) {
        first = finalMatch.team_a?.team_name ?? null;
        second = finalMatch.team_b?.team_name ?? null;
      } else {
        first = finalMatch.team_b?.team_name ?? null;
        second = finalMatch.team_a?.team_name ?? null;
      }
    }

    if (thirdMatch?.status === "completed" && thirdMatch.winner_team_id) {
      if (thirdMatch.winner_team_id === thirdMatch.team_a?.id) {
        third = thirdMatch.team_a?.team_name ?? null;
      } else {
        third = thirdMatch.team_b?.team_name ?? null;
      }
    }

    return { divisionName: div.name, first, second, third };
  });

  const statusDisplay = getTournamentStatusDisplay(
    tournament.status,
    tournament.start_date
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* 뒤로 가기 */}
        <Link
          href={`/tournament/${tournamentId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 대회 상세
        </Link>

        {/* 대회 헤더 */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {tournament.name}
            </h1>
            <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{formatDateRange(tournament.start_date, tournament.end_date)}</span>
            </div>
            {tournament.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{tournament.location}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 챔피언 배너 */}
        {champions.length > 0 && (
          <ChampionBanner
            champions={champions}
            hasMultipleDivisions={hasMultipleDivisions}
          />
        )}

        {/* 탭 + 콘텐츠 */}
        <ResultTabs
          allMatches={allMatches}
          courts={courts}
          divisions={divisionsSimple}
          standingSections={standingSections}
          hasMultipleDivisions={hasMultipleDivisions}
        />
      </div>
    </main>
  );
}

export default async function TournamentResultPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">결과를 불러오는 중...</p>}>
      <ResultContent tournamentId={id} />
    </Suspense>
  );
}
