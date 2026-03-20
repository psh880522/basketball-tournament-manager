import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import {
  getLeagueStandings,
  getTournamentSeedingPreview,
  getTournamentBracketProgress,
  listLeagueMatchesForResult,
  listTournamentMatchesByDivision,
} from "@/lib/api/results";
import ResultForm from "./components/ResultForm";

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

  const [standingsResult, previewResult, matchesResult, tournamentMatchesResult, progressResult] = await Promise.all([
    getLeagueStandings(selectedDivision.id),
    getTournamentSeedingPreview(selectedDivision.id),
    listLeagueMatchesForResult(tournamentId, {
      divisionId: selectedDivision.id,
      courtId: selectedCourtId || undefined,
    }),
    listTournamentMatchesByDivision(selectedDivision.id),
    getTournamentBracketProgress(selectedDivision.id),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">리그 결과 관리</h1>
          <p className="text-sm text-gray-600">
            리그 순위를 확정하고 토너먼트 팀을 배치합니다.
          </p>
        </header>

        <section>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">디비전</label>
              <select
                name="divisionId"
                defaultValue={selectedDivision.id}
                className="rounded border border-gray-200 px-2 py-1 text-sm"
              >
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">코트</label>
              <select
                name="courtId"
                defaultValue={selectedCourtId}
                className="rounded border border-gray-200 px-2 py-1 text-sm"
              >
                <option value="">전체</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded border border-gray-200 px-3 py-2 text-sm"
            >
              조회
            </button>
          </form>
        </section>

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

        {progressResult.error ? (
          <Card className="text-sm text-red-600">{progressResult.error}</Card>
        ) : null}

        <ResultForm
          tournamentId={tournamentId}
          divisionId={selectedDivision.id}
          divisionName={selectedDivision.name}
          isOrganizer={userResult.role === "organizer"}
          standingsDirty={selectedDivision.standings_dirty}
          isConfirmed={selectedDivision.include_tournament_slots}
          tournamentSize={selectedDivision.tournament_size}
          standings={standingsResult.data ?? []}
          preview={previewResult.data ?? []}
          matches={matchesResult.data ?? []}
          tournamentMatches={tournamentMatchesResult.data ?? []}
          tournamentProgress={progressResult.data}
        />
      </div>
    </main>
  );
}
