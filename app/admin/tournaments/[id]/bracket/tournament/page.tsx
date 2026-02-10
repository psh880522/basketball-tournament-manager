import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getDivisionById, getDivisionsByTournament } from "@/lib/api/bracket";
import { getTournamentMatchesByDivision } from "@/lib/api/matches";
import { getStandingsByDivision } from "@/lib/api/standings";
import { advanceTournamentRound, generateSeededBracket } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    divisionId?: string;
    error?: string;
    success?: string;
    nextRound?: string;
  }>;
};

type DivisionOption = {
  id: string;
  name: string;
};

async function TournamentBracketContent({
  tournamentId,
  searchParams,
}: {
  tournamentId: string;
  searchParams?: {
    divisionId?: string;
    error?: string;
    success?: string;
  };
}) {
  const divisionsResult = await getDivisionsByTournament(tournamentId);

  if (divisionsResult.error) {
    return <p style={{ color: "crimson" }}>{divisionsResult.error}</p>;
  }

  const divisions: DivisionOption[] = (divisionsResult.data ?? []).map((division) => ({
    id: division.id,
    name: division.name,
  }));

  if (divisions.length === 0) {
    return <p>No divisions found for this tournament.</p>;
  }

  const selectedDivision =
    divisions.find((division) => division.id === searchParams?.divisionId) ??
    divisions[0];

  const [divisionInfo, standings, matches] = await Promise.all([
    getDivisionById(selectedDivision.id),
    getStandingsByDivision(selectedDivision.id),
    getTournamentMatchesByDivision(selectedDivision.id),
  ]);

  if (divisionInfo.error) {
    return <p style={{ color: "crimson" }}>{divisionInfo.error}</p>;
  }

  if (!divisionInfo.data) {
    return <p>Division not found.</p>;
  }

  if (standings.error) {
    return <p style={{ color: "crimson" }}>{standings.error}</p>;
  }

  if (matches.error) {
    return <p style={{ color: "crimson" }}>{matches.error}</p>;
  }

  const standingsRows = standings.data ?? [];
  const matchRows = matches.data ?? [];
  const quarterfinalMatches = matchRows.filter((match) => match.round === "quarterfinal");
  const semifinalMatches = matchRows.filter((match) => match.round === "semifinal");
  const finalMatches = matchRows.filter((match) => match.round === "final");
  const currentRound = finalMatches.length > 0
    ? "final"
    : semifinalMatches.length > 0
    ? "semifinal"
    : quarterfinalMatches.length > 0
    ? "quarterfinal"
    : null;
  const finalCompleted =
    finalMatches.length > 0 && finalMatches.every((match) => match.status === "completed");
  const message = searchParams?.error
    ? { tone: "error", text: searchParams.error }
    : searchParams?.success
    ? {
        tone: "success",
        text: searchParams?.nextRound
          ? `다음 라운드 생성 완료: ${searchParams.nextRound}`
          : "토너먼트가 생성되었습니다.",
      }
    : null;

  const showEmptyStandings = standingsRows.length === 0;

  return (
    <div style={{ marginTop: 16 }}>
      <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label>
          Division
          <select name="divisionId" defaultValue={selectedDivision.id}>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">조회</button>
      </form>

      <form action={generateSeededBracket} style={{ marginTop: 12 }}>
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="divisionId" value={selectedDivision.id} />
        <button type="submit">토너먼트 생성</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <strong>현재 라운드: {currentRound ?? "-"}</strong>
      </div>

      <form action={advanceTournamentRound} style={{ marginTop: 8 }}>
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="divisionId" value={selectedDivision.id} />
        <input type="hidden" name="currentRound" value={currentRound ?? ""} />
        <button type="submit" disabled={!currentRound || currentRound === "final"}>
          다음 라운드 생성
        </button>
      </form>

      {message ? (
        <p style={{ marginTop: 12, color: message.tone === "error" ? "crimson" : "green" }}>
          {message.text}
        </p>
      ) : null}

      {showEmptyStandings ? (
        <p style={{ marginTop: 16 }}>순위가 계산되지 않아 토너먼트를 생성할 수 없습니다.</p>
      ) : matchRows.length === 0 ? (
        <p style={{ marginTop: 16 }}>생성된 토너먼트 경기가 없습니다.</p>
      ) : (
        <div style={{ marginTop: 16 }}>
          {quarterfinalMatches.length > 0 ? (
            <section style={{ marginBottom: 16 }}>
              <h3>Quarterfinal</h3>
              <ul>
                {quarterfinalMatches.map((match) => (
                  <li key={match.id} style={{ marginBottom: 8 }}>
                    {match.team_a?.team_name ?? "TBD"} vs {match.team_b?.team_name ?? "TBD"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {semifinalMatches.length > 0 ? (
            <section style={{ marginBottom: 16 }}>
              <h3>Semifinal</h3>
              <ul>
                {semifinalMatches.map((match) => (
                  <li key={match.id} style={{ marginBottom: 8 }}>
                    {match.team_a?.team_name ?? "TBD"} vs {match.team_b?.team_name ?? "TBD"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {finalMatches.length > 0 ? (
            <section style={{ marginBottom: 16 }}>
              <h3>Final</h3>
              <ul>
                {finalMatches.map((match) => (
                  <li key={match.id} style={{ marginBottom: 8 }}>
                    {match.team_a?.team_name ?? "TBD"} vs {match.team_b?.team_name ?? "TBD"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {finalCompleted ? (
            <p style={{ marginTop: 12 }}>토너먼트가 종료되었습니다.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default async function TournamentBracketPage({ params, searchParams }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <main style={{ padding: 24 }}>
      <h1>Seeded Bracket</h1>
      <Suspense fallback={<p>Loading bracket...</p>}>
        <TournamentBracketContent
          tournamentId={id}
          searchParams={resolvedSearchParams}
        />
      </Suspense>
    </main>
  );
}
