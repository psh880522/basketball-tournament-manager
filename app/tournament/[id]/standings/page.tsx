import { Suspense } from "react";
import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTournamentSummary } from "@/lib/api/teams";
import { getDivisionsWithGroups, getGroupStandings } from "@/lib/api/standings";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    divisionId?: string;
    groupId?: string;
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
    return <p>조 정보가 없습니다.</p>;
  }

  const selectedDivision =
    divisions.find((division) => division.id === searchParams?.divisionId) ??
    divisions[0];
  const groups = selectedDivision.groups;

  if (groups.length === 0) {
    return <p>조 정보가 없습니다.</p>;
  }

  const selectedGroup =
    groups.find((group) => group.id === searchParams?.groupId) ?? groups[0];

  const standings = await getGroupStandings(
    tournamentId,
    selectedDivision.id,
    selectedGroup.id
  );

  if (standings.error) {
    return <p style={{ color: "crimson" }}>{standings.error}</p>;
  }

  const rows = standings.data ?? [];

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

      {rows.length === 0 ? (
        <p style={{ marginTop: 16 }}>아직 순위가 계산되지 않았습니다.</p>
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
            {rows.map((row) => (
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
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const userResult = await getUserWithRole();
  const tournament = await getTournamentSummary(id);

  if (tournament.error) {
    return <p style={{ color: "crimson" }}>{tournament.error}</p>;
  }

  if (!tournament.data) {
    return <p>대회 정보를 찾을 수 없습니다.</p>;
  }

  const isClosed = tournament.data.status === "closed";

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  const isOrganizer = userResult.status === "ready" && userResult.role === "organizer";
  const isTeamManager = userResult.status === "ready" && userResult.role === "team_manager";
  const canViewAsSpectator = isClosed;

  if (!isOrganizer && !isTeamManager && !canViewAsSpectator) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Standings</h1>
        <p>관람자 조회는 대회 종료 후에 가능합니다.</p>
        <p>
          <Link href="/login">로그인</Link> 후 팀 대표로 확인할 수 있습니다.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Standings</h1>
      <Suspense fallback={<p>Loading standings...</p>}>
        <StandingsContent tournamentId={id} searchParams={resolvedSearchParams} />
      </Suspense>
    </main>
  );
}
