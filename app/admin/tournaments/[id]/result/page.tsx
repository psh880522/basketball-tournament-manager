import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import {
  getLeagueStandings,
  getTournamentSeedingPreview,
  listLeagueMatchesForResult,
  listTournamentMatchesByDivision,
} from "@/lib/api/results";
import ResultForm from "./components/ResultForm";
import ResultFilters from "./Filters";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ divisionId?: string; courtId?: string }>;
};

export default async function TournamentResultPage({
  params,
  searchParams,
}: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");
  if (userResult.status === "error") {
    return <Card className="text-sm text-red-600">{userResult.error}</Card>;
  }
  if (userResult.status === "empty") {
    return <Card className="text-sm text-gray-500">프로필이 없습니다.</Card>;
  }

  const { id: tournamentId } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedDivisionId = resolvedSearchParams?.divisionId ?? "";
  const selectedCourtId = resolvedSearchParams?.courtId ?? "";

  const [divisionsResult, courtsResult] = await Promise.all([
    getDivisionsByTournament(tournamentId),
    getCourtsByTournament(tournamentId),
  ]);

  if (divisionsResult.error) {
    return <Card className="text-sm text-red-600">{divisionsResult.error}</Card>;
  }

  const divisions = divisionsResult.data ?? [];
  if (divisions.length === 0) {
    return <Card className="text-sm text-gray-500">디비전이 없습니다.</Card>;
  }

  const courts = courtsResult.data ?? [];

  const selectedDivision =
    divisions.find((division) => division.id === selectedDivisionId) ??
    divisions[0];

  const [standingsResult, previewResult, matchesResult, tournamentMatchesResult] = await Promise.all([
    getLeagueStandings(selectedDivision.id),
    getTournamentSeedingPreview(selectedDivision.id),
    listLeagueMatchesForResult(tournamentId, {
      divisionId: selectedDivision.id,
      courtId: selectedCourtId || undefined,
    }),
    listTournamentMatchesByDivision(selectedDivision.id, {
      courtId: selectedCourtId || undefined,
    }),
  ]);

  const isConfirmed =
    !selectedDivision.standings_dirty && (standingsResult.data?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">리그 결과 관리</h1>
          <p className="text-sm text-gray-600">
            리그 순위를 확정하고 토너먼트 팀을 배치합니다.
          </p>
        </header>

        <ResultFilters
          tournamentId={tournamentId}
          divisions={divisions.map((d) => ({ id: d.id, name: d.name }))}
          courts={courts.map((c) => ({ id: c.id, name: c.name }))}
          current={{ divisionId: selectedDivisionId, courtId: selectedCourtId }}
        />

        {standingsResult.error ? (
          <Card className="text-sm text-red-600">{standingsResult.error}</Card>
        ) : null}

        {previewResult.error ? (
          <Card className="text-sm text-red-600">{previewResult.error}</Card>
        ) : null}

        {matchesResult.error ? (
          <Card className="text-sm text-red-600">{matchesResult.error}</Card>
        ) : null}

        {tournamentMatchesResult.error ? (
          <Card className="text-sm text-red-600">{tournamentMatchesResult.error}</Card>
        ) : null}

        <ResultForm
          tournamentId={tournamentId}
          divisionId={selectedDivision.id}
          divisionName={selectedDivision.name}
          isOrganizer={userResult.role === "organizer"}
          standingsDirty={selectedDivision.standings_dirty}
          isConfirmed={isConfirmed}
          tournamentSize={selectedDivision.tournament_size}
          standings={standingsResult.data ?? []}
          preview={previewResult.data ?? []}
          matches={matchesResult.data ?? []}
          tournamentMatches={tournamentMatchesResult.data ?? []}
        />
      </div>
    </main>
  );
}
