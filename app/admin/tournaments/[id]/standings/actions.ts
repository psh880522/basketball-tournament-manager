"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCompletedMatchesByGroup } from "@/lib/api/matches";
import {
  getGroupSummary,
  getGroupTeams,
  upsertStandings,
} from "@/lib/api/standings";

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type TeamStats = {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  points_diff: number;
};

export async function recalculateGroupStandings(
  formData: FormData
): Promise<ActionResult> {
  const tournamentId = toText(formData.get("tournamentId"));
  const divisionId = toText(formData.get("divisionId"));
  const groupId = toText(formData.get("groupId"));

  if (!tournamentId || !divisionId || !groupId) {
    return { ok: false, error: "Missing identifiers." };
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      "Login required."
    );
  }

  if (userResult.status === "error") {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      userResult.error ?? "Auth error."
    );
  }

  if (userResult.role !== "organizer") {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      "Forbidden."
    );
  }

  const groupSummary = await getGroupSummary(groupId);

  if (groupSummary.error) {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      groupSummary.error
    );
  }

  if (!groupSummary.data) {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      "Group not found."
    );
  }

  if (
    groupSummary.data.division_id !== divisionId ||
    groupSummary.data.divisions?.tournament_id !== tournamentId
  ) {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      "Invalid group selection."
    );
  }

  const groupTeams = await getGroupTeams(groupId);

  if (groupTeams.error) {
    return redirectWithError(tournamentId, divisionId, groupId, groupTeams.error);
  }

  if (!groupTeams.data || groupTeams.data.length === 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      "조/팀 데이터가 없습니다."
    );
  }

  const matches = await getCompletedMatchesByGroup(groupId);

  if (matches.error) {
    return redirectWithError(tournamentId, divisionId, groupId, matches.error);
  }

  if (!matches.data || matches.data.length === 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      groupId,
      "완료된 경기가 없습니다."
    );
  }

  const statsByTeam: Record<string, TeamStats> = {};

  groupTeams.data.forEach((entry) => {
    const team = entry.teams;
    if (!team) return;
    statsByTeam[entry.team_id] = {
      team_id: entry.team_id,
      team_name: team.team_name,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      points_diff: 0,
    };
  });

  for (const match of matches.data) {
    if (
      match.score_a === null ||
      match.score_b === null ||
      !match.winner_team_id
    ) {
      return redirectWithError(
        tournamentId,
        divisionId,
        groupId,
        "완료 경기 점수가 없습니다."
      );
    }

    const teamA = statsByTeam[match.team_a_id];
    const teamB = statsByTeam[match.team_b_id];

    if (!teamA || !teamB) {
      return redirectWithError(
        tournamentId,
        divisionId,
        groupId,
        "경기 팀 정보가 올바르지 않습니다."
      );
    }

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
      return redirectWithError(
        tournamentId,
        divisionId,
        groupId,
        "승자 정보가 올바르지 않습니다."
      );
    }
  }

  const teams = Object.values(statsByTeam).map((team) => ({
    ...team,
    points_diff: team.points_for - team.points_against,
  }));

  const matchesData = matches.data;
  const groupedByWins = groupByWins(teams);
  const sortedTeams: TeamStats[] = [];

  groupedByWins.forEach((group) => {
    const teamIds = group.map((item) => item.team_id);
    const headToHeadWins = buildHeadToHeadWins(teamIds, matchesData);

    const sortedGroup = [...group].sort((a, b) => {
      const h2h = (headToHeadWins[b.team_id] ?? 0) - (headToHeadWins[a.team_id] ?? 0);
      if (h2h !== 0) return h2h;
      if (b.points_for !== a.points_for) return b.points_for - a.points_for;
      if (a.points_against !== b.points_against) {
        return a.points_against - b.points_against;
      }
      return a.team_name.localeCompare(b.team_name);
    });

    sortedTeams.push(...sortedGroup);
  });

  const standingsInput = sortedTeams.map((team, index) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    group_id: groupId,
    team_id: team.team_id,
    wins: team.wins,
    losses: team.losses,
    points_for: team.points_for,
    points_against: team.points_against,
    points_diff: team.points_diff,
    rank: index + 1,
  }));

  const upserted = await upsertStandings(standingsInput);

  if (upserted.error) {
    return redirectWithError(tournamentId, divisionId, groupId, upserted.error);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/standings`);

  return redirectWithSuccess(tournamentId, divisionId, groupId);
}

const toText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

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
    if (!winsByTeam[match.winner_team_id]) {
      winsByTeam[match.winner_team_id] = 0;
    }
    winsByTeam[match.winner_team_id] += 1;
  });

  return winsByTeam;
};

const buildRedirectUrl = (
  tournamentId: string,
  divisionId: string,
  groupId: string,
  extra?: { error?: string; success?: boolean }
) => {
  const params = new URLSearchParams();
  params.set("divisionId", divisionId);
  params.set("groupId", groupId);
  if (extra?.error) params.set("error", extra.error);
  if (extra?.success) params.set("success", "1");
  return `/admin/tournaments/${tournamentId}/standings?${params.toString()}`;
};

const redirectWithError = (
  tournamentId: string,
  divisionId: string,
  groupId: string,
  message: string
): ActionResult => {
  redirect(buildRedirectUrl(tournamentId, divisionId, groupId, { error: message }));
  return { ok: false, error: message };
};

const redirectWithSuccess = (
  tournamentId: string,
  divisionId: string,
  groupId: string
): ActionResult => {
  redirect(buildRedirectUrl(tournamentId, divisionId, groupId, { success: true }));
  return { ok: true };
};
