"use server";

import { redirect } from "next/navigation";
import { assertTournamentStepAllowed } from "@/lib/api/tournamentGuards";
import {
  countMatchesByDivision,
  createGroupTeams,
  createGroups,
  createMatches,
  getApprovedTeamsByDivision,
  getDivisionById,
  getTournamentStatus,
} from "@/lib/api/bracket";
import { updateDivision } from "@/lib/api/divisions";
import { deleteMatchesByDivision } from "@/lib/api/matches";
import { deleteGroupsByDivision } from "@/lib/api/groups";
import {
  previewDivisionGeneration,
  type PreviewResult,
} from "@/lib/api/bracketPreview";

type ActionResult = { ok: true } | { ok: false; error: string };

/* ── 미리보기 ── */

export async function previewDivisionAction(input: {
  tournamentId: string;
  divisionId: string;
  groupSize?: number;
}): Promise<PreviewResult> {
  return previewDivisionGeneration(input);
}

/* ── group_size 저장 ── */

export async function updateGroupSizeAction(
  divisionId: string,
  groupSize: number
): Promise<ActionResult> {
  return updateDivision(divisionId, { group_size: groupSize });
}

/* ── 경기 생성 / 덮어쓰기 ── */

type GenerateInput = {
  tournamentId: string;
  divisionId: string;
  overwrite: boolean;
};

const groupName = (index: number) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < alphabet.length ? `${alphabet[index]}조` : `${index + 1}조`;
};

export async function generateDivisionMatches(
  input: GenerateInput
): Promise<ActionResult> {
  const { tournamentId, divisionId, overwrite } = input;

  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 식별자가 누락되었습니다." };
  }

  /* guard: organizer + tournament owner
     overwrite=true 시 guard의 "이미 조/경기 존재" 체크를 건너뛰기 위해
     별도 stepKey("ASSIGN_COURT")로 organizer+tournament 유효성만 확인 */
  const guard = await assertTournamentStepAllowed({
    tournamentId,
    divisionId,
    stepKey: overwrite ? "ASSIGN_COURT" : "GENERATE_GROUP_STAGE",
  });
  if (!guard.ok) return { ok: false, error: guard.error };

  /* tournament status */
  const tournament = await getTournamentStatus(tournamentId);
  if (tournament.error) return { ok: false, error: tournament.error };
  if (!tournament.data) return { ok: false, error: "대회를 찾을 수 없습니다." };
  if (tournament.data.status !== "closed") {
    return { ok: false, error: "대회가 마감(closed) 상태여야 합니다." };
  }

  /* division */
  const div = await getDivisionById(divisionId);
  if (div.error) return { ok: false, error: div.error };
  if (!div.data) return { ok: false, error: "Division을 찾을 수 없습니다." };
  if (div.data.tournament_id !== tournamentId) {
    return { ok: false, error: "Division이 해당 대회에 속하지 않습니다." };
  }
  if (div.data.group_size < 2) {
    return { ok: false, error: "그룹 크기는 2 이상이어야 합니다." };
  }

  /* existing matches check */
  const existing = await countMatchesByDivision(divisionId);
  if (existing.error) return { ok: false, error: existing.error };

  if (existing.count > 0 && !overwrite) {
    return {
      ok: false,
      error: "이미 경기가 존재합니다. 덮어쓰기를 사용하세요.",
    };
  }

  /* overwrite: 기존 matches → groups(+ group_teams CASCADE) 삭제 */
  if (overwrite) {
    const delM = await deleteMatchesByDivision(divisionId);
    if (delM.error) return { ok: false, error: delM.error };
    const delG = await deleteGroupsByDivision(divisionId);
    if (delG.error) return { ok: false, error: delG.error };
  }

  /* approved teams */
  const teamsResult = await getApprovedTeamsByDivision(divisionId, tournamentId);
  if (teamsResult.error) return { ok: false, error: teamsResult.error };
  const teams = teamsResult.data ?? [];
  if (teams.length < 2) {
    return { ok: false, error: "승인된 팀이 2개 이상 필요합니다." };
  }

  /* create groups */
  const groupSize = div.data.group_size;
  const groupCount = Math.ceil(teams.length / groupSize);
  const groupDefs = Array.from({ length: groupCount }, (_, i) => ({
    name: groupName(i),
    order: i + 1,
  }));

  const groupsResult = await createGroups(divisionId, groupDefs);
  if (groupsResult.error) return { ok: false, error: groupsResult.error };
  const groups = (groupsResult.data ?? []).sort((a, b) => a.order - b.order);
  if (groups.length === 0) {
    return { ok: false, error: "조 생성에 실패했습니다." };
  }

  /* assign teams to groups (순서대로 group_size씩) */
  const groupTeams: { group_id: string; team_id: string }[] = [];
  const teamsByGroup: Record<string, string[]> = {};

  teams.forEach((team, index) => {
    const gi = Math.floor(index / groupSize);
    const group = groups[Math.min(gi, groups.length - 1)];
    if (!group) return;
    groupTeams.push({ group_id: group.id, team_id: team.id });
    if (!teamsByGroup[group.id]) teamsByGroup[group.id] = [];
    teamsByGroup[group.id].push(team.id);
  });

  const gtResult = await createGroupTeams(groupTeams);
  if (gtResult.error) return { ok: false, error: gtResult.error };

  /* round-robin matches */
  const matches: {
    tournament_id: string;
    division_id: string;
    group_id: string | null;
    team_a_id: string;
    team_b_id: string;
    status: string;
    court_id: string | null;
  }[] = [];

  for (const [groupId, teamIds] of Object.entries(teamsByGroup)) {
    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        matches.push({
          tournament_id: tournamentId,
          division_id: divisionId,
          group_id: groupId,
          team_a_id: teamIds[i],
          team_b_id: teamIds[j],
          status: "scheduled",
          court_id: null,
        });
      }
    }
  }

  if (matches.length === 0) {
    return { ok: false, error: "생성된 경기가 없습니다." };
  }

  const matchResult = await createMatches(matches);
  if (matchResult.error) return { ok: false, error: matchResult.error };

  /* success → 운영 화면으로 이동 */
  redirect(`/admin/tournaments/${tournamentId}`);
}
