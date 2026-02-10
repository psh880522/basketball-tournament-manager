import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCompletedMatchesByGroup } from "@/lib/api/matches";
import {
  getDivisionsWithGroups,
  getGroupTeams,
  getStandingsByGroup,
} from "@/lib/api/standings";
import { recalculateGroupStandings } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    divisionId?: string;
    groupId?: string;
    error?: string;
    success?: string;
  }>;
};

type DivisionOption = {
  id: string;
  name: string;
  groups: { id: string; name: string; order: number }[];
};

async function StandingsContent({
  tournamentId,
  searchParams,
}: {
  tournamentId: string;
  searchParams?: {
    divisionId?: string;
    groupId?: string;
    error?: string;
    success?: string;
  };
}) {
  const divisionsResult = await getDivisionsWithGroups(tournamentId);

  if (divisionsResult.error) {
    return <p style={{ color: "crimson" }}>{divisionsResult.error}</p>;
  }

  const divisions: DivisionOption[] = (divisionsResult.data ?? [])
    .map((division) => ({
      id: division.id,
      name: division.name,
      groups: (division.groups ?? []).sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (divisions.length === 0) {
    return <p>조/팀 데이터가 없습니다.</p>;
  }

  const selectedDivision =
    divisions.find((division) => division.id === searchParams?.divisionId) ??
    divisions[0];
  const groups = selectedDivision.groups;

  if (groups.length === 0) {
    return <p>조/팀 데이터가 없습니다.</p>;
  }

  const selectedGroup =
    groups.find((group) => group.id === searchParams?.groupId) ?? groups[0];

  const [groupTeams, matches, standings] = await Promise.all([
    getGroupTeams(selectedGroup.id),
    getCompletedMatchesByGroup(selectedGroup.id),
    getStandingsByGroup(selectedGroup.id),
  ]);

  if (groupTeams.error) {
    return <p style={{ color: "crimson" }}>{groupTeams.error}</p>;
  }

  if (matches.error) {
    return <p style={{ color: "crimson" }}>{matches.error}</p>;
  }

  if (standings.error) {
    return <p style={{ color: "crimson" }}>{standings.error}</p>;
  }

  const message = searchParams?.error
    ? { tone: "error", text: searchParams.error }
    : searchParams?.success
    ? { tone: "success", text: "순위 계산이 완료되었습니다." }
    : null;

  const teamsEmpty = !groupTeams.data || groupTeams.data.length === 0;
  const matchesEmpty = !matches.data || matches.data.length === 0;
  const standingsRows = standings.data ?? [];

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
        <label>
          Group
          <select name="groupId" defaultValue={selectedGroup.id}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">조회</button>
      </form>

      <form action={recalculateGroupStandings} style={{ marginTop: 12 }}>
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="divisionId" value={selectedDivision.id} />
        <input type="hidden" name="groupId" value={selectedGroup.id} />
        <button type="submit">순위 계산</button>
      </form>

      {message ? (
        <p style={{ marginTop: 12, color: message.tone === "error" ? "crimson" : "green" }}>
          {message.text}
        </p>
      ) : null}

      {teamsEmpty ? (
        <p style={{ marginTop: 16 }}>조/팀 데이터가 없습니다.</p>
      ) : matchesEmpty ? (
        <p style={{ marginTop: 16 }}>완료된 경기가 없습니다.</p>
      ) : standingsRows.length === 0 ? (
        <p style={{ marginTop: 16 }}>순위 데이터가 없습니다.</p>
      ) : (
        <table style={{ marginTop: 16, borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Rank</th>
              <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Team</th>
              <th style={{ borderBottom: "1px solid #ddd" }}>W</th>
              <th style={{ borderBottom: "1px solid #ddd" }}>L</th>
              <th style={{ borderBottom: "1px solid #ddd" }}>PF</th>
              <th style={{ borderBottom: "1px solid #ddd" }}>PA</th>
              <th style={{ borderBottom: "1px solid #ddd" }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {standingsRows.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "6px 4px" }}>{row.rank}</td>
                <td style={{ padding: "6px 4px" }}>{row.teams?.team_name ?? "-"}</td>
                <td style={{ padding: "6px 4px", textAlign: "center" }}>{row.wins}</td>
                <td style={{ padding: "6px 4px", textAlign: "center" }}>{row.losses}</td>
                <td style={{ padding: "6px 4px", textAlign: "center" }}>{row.points_for}</td>
                <td style={{ padding: "6px 4px", textAlign: "center" }}>
                  {row.points_against}
                </td>
                <td style={{ padding: "6px 4px", textAlign: "center" }}>{row.points_diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function TournamentStandingsPage({
  params,
  searchParams,
}: PageProps) {
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
      <h1>Group Standings</h1>
      <Suspense fallback={<p>Loading standings...</p>}>
        <StandingsContent tournamentId={id} searchParams={resolvedSearchParams} />
      </Suspense>
    </main>
  );
}
