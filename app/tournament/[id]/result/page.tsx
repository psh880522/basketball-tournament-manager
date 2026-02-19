import { Suspense } from "react";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTournamentBracketMatches } from "@/lib/api/matches";
import { getDivisionsWithGroups, getStandingsByGroup } from "@/lib/api/standings";
import { getPublicTournamentById } from "@/lib/api/tournaments";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RoundGroup = {
  round: string;
  label: string;
  matches: {
    id: string;
    status: string;
    score_a: number | null;
    score_b: number | null;
    team_a: { id: string; team_name: string } | null;
    team_b: { id: string; team_name: string } | null;
  }[];
};

const roundLabels: Record<string, string> = {
  quarterfinal: "8강",
  semifinal: "4강",
  final: "결승",
};

const roundOrder = ["quarterfinal", "semifinal", "final"];

const formatDateRange = (start: string | null, end: string | null) => {
  const startLabel = start || "TBD";
  const endLabel = end || "TBD";
  return `${startLabel} - ${endLabel}`;
};

async function ResultContent({ tournamentId }: { tournamentId: string }) {
  const [tournamentResult, bracketResult, divisionsResult, userResult] =
    await Promise.all([
      getPublicTournamentById(tournamentId),
      getTournamentBracketMatches(tournamentId),
      getDivisionsWithGroups(tournamentId),
      getUserWithRole(),
    ]);

  if (tournamentResult.error) {
    return <p style={{ color: "crimson" }}>대회 정보를 불러오지 못했습니다.</p>;
  }

  if (!tournamentResult.data) {
    return <p>존재하지 않는 대회입니다.</p>;
  }

  if (bracketResult.error) {
    return <p style={{ color: "crimson" }}>토너먼트 결과를 불러오지 못했습니다.</p>;
  }

  if (divisionsResult.error) {
    return <p style={{ color: "crimson" }}>순위 정보를 불러오지 못했습니다.</p>;
  }

  const tournament = tournamentResult.data;
  const isOrganizer = userResult.status === "ready" && userResult.role === "organizer";
  const isPublicVisible = tournament.status === "closed" || tournament.status === "finished";

  if (!isOrganizer && !isPublicVisible) {
    return <p>결과는 종료된 대회에서만 확인할 수 있습니다.</p>;
  }

  const bracketMatches = bracketResult.data ?? [];
  const finalMatch = bracketMatches.find((match) => match.round === "final") ?? null;
  const championName =
    finalMatch && finalMatch.status === "completed" && finalMatch.winner_team_id
      ? finalMatch.winner_team_id === finalMatch.team_a?.id
        ? finalMatch.team_a?.team_name
        : finalMatch.winner_team_id === finalMatch.team_b?.id
        ? finalMatch.team_b?.team_name
        : null
      : null;

  const roundGroups = new Map<string, RoundGroup>();
  bracketMatches.forEach((match) => {
    const roundKey = match.round || "other";
    const label = roundLabels[roundKey] ?? "기타";
    if (!roundGroups.has(roundKey)) {
      roundGroups.set(roundKey, { round: roundKey, label, matches: [] });
    }
    roundGroups.get(roundKey)?.matches.push({
      id: match.id,
      status: match.status,
      score_a: match.score_a,
      score_b: match.score_b,
      team_a: match.team_a,
      team_b: match.team_b,
    });
  });

  const sortedRounds = [...roundGroups.values()].sort((a, b) => {
    const aIndex = roundOrder.indexOf(a.round);
    const bIndex = roundOrder.indexOf(b.round);
    if (aIndex === -1 && bIndex === -1) return a.round.localeCompare(b.round);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const divisions = divisionsResult.data ?? [];
  const standingsByGroup = await Promise.all(
    divisions.flatMap((division) =>
      (division.groups ?? []).map(async (group) => {
        const standingsResult = await getStandingsByGroup(group.id);
        return {
          divisionId: division.id,
          divisionName: division.name,
          groupId: group.id,
          groupName: group.name,
          groupOrder: group.order,
          standings: standingsResult.data ?? [],
          error: standingsResult.error,
        };
      })
    )
  );

  const standingsError = standingsByGroup.find((entry) => entry.error);

  if (standingsError?.error) {
    return <p style={{ color: "crimson" }}>순위 정보를 불러오지 못했습니다.</p>;
  }

  const hasStandings = standingsByGroup.some((entry) => entry.standings.length > 0);

  return (
    <main style={{ padding: 24, background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 24 }}>
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <h1 style={{ margin: 0 }}>{tournament.name}</h1>
          <p style={{ marginTop: 8, color: "#4b5563" }}>
            기간: {formatDateRange(tournament.start_date, tournament.end_date)}
          </p>
          <p style={{ marginTop: 4, color: "#4b5563" }}>
            장소: {tournament.location || "TBD"}
          </p>
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>우승팀</h2>
          {championName ? (
            <div style={{ fontSize: 18, fontWeight: 600 }}>{championName}</div>
          ) : (
            <p>아직 우승팀이 확정되지 않았습니다.</p>
          )}
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>토너먼트 결과</h2>
          {sortedRounds.length === 0 ? (
            <p>토너먼트 결과가 없습니다.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {sortedRounds.map((round) => (
                <div key={round.round}>
                  <h3 style={{ marginBottom: 8 }}>{round.label}</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {round.matches.map((match) => {
                      const teamA = match.team_a?.team_name ?? "TBD";
                      const teamB = match.team_b?.team_name ?? "TBD";
                      const scoreLabel =
                        match.score_a !== null && match.score_b !== null
                          ? `${match.score_a} : ${match.score_b}`
                          : "-";
                      return (
                        <div
                          key={match.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: 12,
                          }}
                        >
                          <strong>
                            {teamA} vs {teamB}
                          </strong>
                          <div style={{ marginTop: 6, color: "#4b5563" }}>
                            점수: {scoreLabel}
                          </div>
                          <div style={{ color: "#6b7280" }}>
                            상태: {match.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>조별 리그 최종 순위</h2>
          {!hasStandings ? (
            <p>아직 순위가 계산되지 않았습니다.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {standingsByGroup
                .sort((a, b) => {
                  if (a.divisionName !== b.divisionName) {
                    return a.divisionName.localeCompare(b.divisionName);
                  }
                  return a.groupOrder - b.groupOrder;
                })
                .map((entry) => (
                  <div key={entry.groupId}>
                    <h3 style={{ marginBottom: 8 }}>
                      {entry.divisionName} - {entry.groupName}
                    </h3>
                    {entry.standings.length === 0 ? (
                      <p>순위 데이터가 없습니다.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 6 }}>
                        {entry.standings.map((row) => (
                          <div
                            key={row.id}
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              padding: 10,
                              display: "grid",
                              gap: 4,
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {row.rank}위 - {row.teams?.team_name ?? "TBD"}
                            </div>
                            <div style={{ color: "#6b7280" }}>
                              {row.wins}승 {row.losses}패 | 득점 {row.points_for} |
                              실점 {row.points_against} | 득실 {row.points_diff}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default async function TournamentResultPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<p>결과를 불러오는 중...</p>}>
      <ResultContent tournamentId={id} />
    </Suspense>
  );
}
