import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCaptainTeams } from "@/lib/api/teams";
import { getPlayersByTeam } from "@/lib/api/players";
import PlayersForm from "./Form";

type TeamPlayers = {
  id: string;
  team_name: string;
  status: string;
  players: {
    id: string;
    name: string;
    number: number | null;
    position: string | null;
  }[];
};

export default async function TeamPlayersPage() {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "team_manager") redirect("/dashboard");

  if (!userResult.user) {
    return <p>Missing user identity.</p>;
  }

  const teams = await getCaptainTeams(userResult.user.id);

  if (teams.error) {
    return <p style={{ color: "crimson" }}>{teams.error}</p>;
  }

  if (!teams.data || teams.data.length === 0) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Players</h1>
        <p>신청한 팀이 없습니다.</p>
        <Link href="/">대회 목록 보기</Link>
      </main>
    );
  }

  const teamPlayers = await Promise.all(
    teams.data.map(async (team) => {
      const players = await getPlayersByTeam(team.id);
      return {
        id: team.id,
        team_name: team.team_name,
        status: team.status,
        players: players.data ?? [],
        error: players.error,
      };
    })
  );

  const firstError = teamPlayers.find((team) => team.error)?.error;

  if (firstError) {
    return <p style={{ color: "crimson" }}>{firstError}</p>;
  }

  const teamsWithPlayers: TeamPlayers[] = teamPlayers.map((team) => ({
    id: team.id,
    team_name: team.team_name,
    status: team.status,
    players: team.players,
  }));

  return (
    <main style={{ padding: 24 }}>
      <h1>Players</h1>
      <PlayersForm teams={teamsWithPlayers} />
    </main>
  );
}
