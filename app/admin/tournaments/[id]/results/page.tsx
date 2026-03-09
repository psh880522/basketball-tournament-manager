import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listMatchesForResultEntry } from "@/lib/api/matches";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import ResultEntryForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    divisionId?: string;
    courtId?: string;
  }>;
};

export default async function ResultsPage({
  params,
  searchParams,
}: PageProps) {
  const { id: tournamentId } = await params;
  const sp = await searchParams;

  const auth = await getUserWithRole();
  if (auth.status === "unauthenticated") redirect("/login");
  if (auth.status === "error" || auth.status === "empty") redirect("/login");
  if (auth.role !== "organizer") redirect("/login");

  const divisionId = sp.divisionId ?? "";
  const courtId = sp.courtId ?? "";

  const [matchesResult, divisionsResult, courtsResult] = await Promise.all([
    listMatchesForResultEntry(tournamentId, {
      divisionId: divisionId || undefined,
      courtId: courtId || undefined,
    }),
    getDivisionsByTournament(tournamentId),
    getCourtsByTournament(tournamentId),
  ]);

  if (matchesResult.error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          경기 목록을 불러올 수 없습니다: {matchesResult.error}
        </div>
      </div>
    );
  }

  const matches = matchesResult.data ?? [];
  const divisions = divisionsResult.data ?? [];
  const courts = courtsResult.data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/admin/tournaments/${tournamentId}`}
          className="text-blue-600 hover:underline"
        >
          ← 운영 홈
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href={`/admin/tournaments/${tournamentId}/matches`}
          className="text-blue-600 hover:underline"
        >
          경기 목록
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Result Entry</h1>

      <ResultEntryForm
        tournamentId={tournamentId}
        matches={matches}
        divisions={divisions}
        courts={courts}
        currentDivisionId={divisionId}
        currentCourtId={courtId}
      />
    </div>
  );
}
