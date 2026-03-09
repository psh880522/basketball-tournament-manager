"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listCompletedMatchesByDivision } from "@/lib/api/matches";
import { replaceDivisionStandings } from "@/lib/api/standings";
import { setDivisionStandingsDirty } from "@/lib/api/divisions";

type TeamStats = {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  points_diff: number;
};

export async function calculateDivisionStandings(
  formData: FormData
): Promise<void> {
  const tournamentId = toText(formData.get("tournamentId"));
  const divisionId = toText(formData.get("divisionId"));

  if (!tournamentId || !divisionId) {
    redirect("/admin");
  }

  const auth = await getUserWithRole();
  if (auth.status === "unauthenticated") redirect("/login");
  if (auth.status === "error" || auth.status === "empty") {
    redirect(buildRedirectUrl(tournamentId, divisionId, "인증 오류가 발생했습니다."));
  }
  if (auth.role !== "organizer") redirect("/dashboard");

  const matchesResult = await listCompletedMatchesByDivision(divisionId);
  if (matchesResult.error) {
    redirect(buildRedirectUrl(tournamentId, divisionId, matchesResult.error));
  }

  const matches = matchesResult.data ?? [];
  if (matches.length === 0) {
    redirect(buildRedirectUrl(tournamentId, divisionId, "완료된 경기가 없습니다."));
  }

  const statsByTeam: Record<string, TeamStats> = {};

  for (const match of matches) {
    if (match.score_a === null || match.score_b === null || !match.winner_team_id) {
      redirect(buildRedirectUrl(tournamentId, divisionId, "완료 경기 점수가 없습니다."));
    }

    if (!statsByTeam[match.team_a_id]) {
      statsByTeam[match.team_a_id] = {
        team_id: match.team_a_id,
        team_name: match.team_a?.team_name ?? "-",
        wins: 0,
        losses: 0,
        points_for: 0,
        points_against: 0,
        points_diff: 0,
      };
    }

    if (!statsByTeam[match.team_b_id]) {
      statsByTeam[match.team_b_id] = {
        team_id: match.team_b_id,
        team_name: match.team_b?.team_name ?? "-",
        wins: 0,
        losses: 0,
        points_for: 0,
        points_against: 0,
        points_diff: 0,
      };
    }

    const teamA = statsByTeam[match.team_a_id];
    const teamB = statsByTeam[match.team_b_id];

    teamA.points_for += match.score_a;
    teamA.points_against += match.score_b;
    teamB.points_for += match.score_b;
    teamB.points_against += match.score_a;

    if (match.winner_team_id === match.team_a_id) {
      teamA.wins += 1;
      teamB.losses += 1;
    } else if (match.winner_team_id === match.team_b_id) {
      teamB.wins += 1;
      teamA.losses += 1;
    } else {
      redirect(buildRedirectUrl(tournamentId, divisionId, "승자 정보가 올바르지 않습니다."));
    }
  }

  const teams = Object.values(statsByTeam).map((team) => ({
    ...team,
    points_diff: team.points_for - team.points_against,
  }));

  const groupedByWins = groupByWins(teams);
  const sortedTeams: TeamStats[] = [];

  groupedByWins.forEach((group) => {
    const teamIds = group.map((item) => item.team_id);
    const headToHeadWins = buildHeadToHeadWins(teamIds, matches);

    const sortedGroup = [...group].sort((a, b) => {
      const h2h = (headToHeadWins[b.team_id] ?? 0) - (headToHeadWins[a.team_id] ?? 0);
      if (h2h !== 0) return h2h;
      if (b.points_for !== a.points_for) return b.points_for - a.points_for;
      if (a.points_against !== b.points_against) return a.points_against - b.points_against;
      return a.team_name.localeCompare(b.team_name);
    });

    sortedTeams.push(...sortedGroup);
  });

  const rows = sortedTeams.map((team, index) => ({
    team_id: team.team_id,
    wins: team.wins,
    losses: team.losses,
    points_for: team.points_for,
    points_against: team.points_against,
    points_diff: team.points_diff,
    rank: index + 1,
  }));

  const saved = await replaceDivisionStandings(tournamentId, divisionId, rows);
  if (saved.error) {
    redirect(buildRedirectUrl(tournamentId, divisionId, saved.error));
  }

  const dirtyResult = await setDivisionStandingsDirty(divisionId, false);
  if (!dirtyResult.ok) {
    redirect(buildRedirectUrl(tournamentId, divisionId, dirtyResult.error));
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/standings`);
  redirect(buildRedirectUrl(tournamentId, divisionId, undefined, true));
}

const toText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const groupByWins = (teams: TeamStats[]) => {
  const map = new Map<number, TeamStats[]>();
  teams.forEach((team) => {
    const list = map.get(team.wins) ?? [];
    list.push(team);
    map.set(team.wins, list);
  });

  return new Map(
    [...map.entries()].sort((a, b) => b[0] - a[0]).map(([wins, list]) => [wins, list])
  );
};

const buildHeadToHeadWins = (
  teamIds: string[],
  matches: {
    team_a_id: string;
    team_b_id: string;
    winner_team_id: string | null;
  }[]
) => {
  const idSet = new Set(teamIds);
  const winsByTeam: Record<string, number> = {};

  teamIds.forEach((id) => {
    winsByTeam[id] = 0;
  });

  matches.forEach((match) => {
    if (!match.winner_team_id) return;
    if (!idSet.has(match.team_a_id) || !idSet.has(match.team_b_id)) return;
    winsByTeam[match.winner_team_id] = (winsByTeam[match.winner_team_id] ?? 0) + 1;
  });

  return winsByTeam;
};

const buildRedirectUrl = (
  tournamentId: string,
  divisionId: string,
  error?: string,
  success?: boolean
) => {
  const params = new URLSearchParams();
  params.set("divisionId", divisionId);
  if (error) params.set("error", error);
  if (success) params.set("success", "1");
  return `/admin/tournaments/${tournamentId}/standings?${params.toString()}`;
};
