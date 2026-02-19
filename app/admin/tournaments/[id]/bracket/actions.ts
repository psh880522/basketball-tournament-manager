"use server";

import { assertTournamentStepAllowed } from "@/lib/api/tournamentGuards";
import {
  countGroupsByDivision,
  countMatchesByDivision,
  createGroupTeams,
  createGroups,
  createMatches,
  getApprovedTeamsByDivision,
  getDivisionById,
  getTournamentStatus,
} from "@/lib/api/bracket";

type GenerateInput = {
  tournamentId: string;
  divisionId: string;
};

type GenerateResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

const shuffle = <T,>(items: T[]) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const groupName = (index: number) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return `${alphabet[index]} Group`;
  return `Group ${index + 1}`;
};

export async function generateGroupStage(
  input: GenerateInput
): Promise<GenerateResult> {
  if (!input.tournamentId || !input.divisionId) {
    return { ok: false, error: "Missing identifiers." };
  }

  const guard = await assertTournamentStepAllowed({
    tournamentId: input.tournamentId,
    divisionId: input.divisionId,
    stepKey: "GENERATE_GROUP_STAGE",
  });

  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const tournament = await getTournamentStatus(input.tournamentId);

  if (tournament.error) {
    return { ok: false, error: tournament.error };
  }

  if (!tournament.data) {
    return { ok: false, error: "Tournament not found." };
  }

  if (tournament.data.status !== "closed") {
    return { ok: false, error: "Tournament must be closed." };
  }

  const division = await getDivisionById(input.divisionId);

  if (division.error) {
    return { ok: false, error: division.error };
  }

  if (!division.data) {
    return { ok: false, error: "Division not found." };
  }

  if (division.data.tournament_id !== input.tournamentId) {
    return { ok: false, error: "Division does not belong to tournament." };
  }

  if (division.data.group_size < 2) {
    return { ok: false, error: "Group size must be at least 2." };
  }

  const existingGroups = await countGroupsByDivision(input.divisionId);

  if (existingGroups.error) {
    return { ok: false, error: existingGroups.error };
  }

  const existingMatches = await countMatchesByDivision(input.divisionId);

  if (existingMatches.error) {
    return { ok: false, error: existingMatches.error };
  }

  if (existingGroups.count > 0 || existingMatches.count > 0) {
    return { ok: false, error: "Groups or matches already exist." };
  }

  const teamsResult = await getApprovedTeamsByDivision(input.divisionId);

  if (teamsResult.error) {
    return { ok: false, error: teamsResult.error };
  }

  const teams = teamsResult.data ?? [];

  if (teams.length < 2) {
    return { ok: false, error: "Not enough approved teams." };
  }

  const groupCount = Math.ceil(teams.length / division.data.group_size);
  const shuffled = shuffle(teams);
  const groupDefinitions = Array.from({ length: groupCount }, (_, index) => ({
    name: groupName(index),
    order: index + 1,
  }));

  const groupsResult = await createGroups(input.divisionId, groupDefinitions);

  if (groupsResult.error) {
    return { ok: false, error: groupsResult.error };
  }

  const groups = (groupsResult.data ?? []).sort((a, b) => a.order - b.order);

  if (groups.length === 0) {
    return { ok: false, error: "Failed to create groups." };
  }

  const groupTeams: { group_id: string; team_id: string }[] = [];
  const teamsByGroup: Record<string, string[]> = {};

  shuffled.forEach((team, index) => {
    const groupIndex = index % groupCount;
    const group = groups[groupIndex];
    if (!group) return;
    groupTeams.push({ group_id: group.id, team_id: team.id });
    if (!teamsByGroup[group.id]) {
      teamsByGroup[group.id] = [];
    }
    teamsByGroup[group.id].push(team.id);
  });

  const groupTeamsResult = await createGroupTeams(groupTeams);

  if (groupTeamsResult.error) {
    return { ok: false, error: groupTeamsResult.error };
  }

  const matches: {
    tournament_id: string;
    division_id: string;
    group_id: string | null;
    team_a_id: string;
    team_b_id: string;
    status: string;
    court_id: string | null;
  }[] = [];

  Object.entries(teamsByGroup).forEach(([groupId, teamIds]) => {
    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        matches.push({
          tournament_id: input.tournamentId,
          division_id: input.divisionId,
          group_id: groupId,
          team_a_id: teamIds[i],
          team_b_id: teamIds[j],
          status: "scheduled",
          court_id: null,
        });
      }
    }
  });

  if (matches.length === 0) {
    return { ok: false, error: "No matches generated." };
  }

  const matchesResult = await createMatches(matches);

  if (matchesResult.error) {
    return { ok: false, error: matchesResult.error };
  }

  return { ok: true };
}
