import { getUserWithRole } from "@/src/lib/auth/roles";
import { listApprovedTeamsByDivision } from "@/lib/api/applications";
import { getDivisionById } from "@/lib/api/bracket";

/* ── Types ── */

export type PreviewTeam = {
  teamId: string;
  teamName: string;
};

export type GroupPreview = {
  groupIndex: number;
  groupName: string;
  teams: PreviewTeam[];
  matchCount: number;
};

export type PreviewResult =
  | {
      ok: true;
      division: { id: string; name: string; groupSize: number };
      teams: PreviewTeam[];
      groupsPreview: GroupPreview[];
      totals: { teamCount: number; groupCount: number; matchCount: number };
      warnings: string[];
    }
  | { ok: false; error: string };

/* ── Helper ── */

const makeGroupName = (index: number) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < alphabet.length ? `${alphabet[index]}조` : `${index + 1}조`;
};

/* ── Main ── */

export async function previewDivisionGeneration(input: {
  tournamentId: string;
  divisionId: string;
  groupSize?: number;
}): Promise<PreviewResult> {
  const { tournamentId, divisionId } = input;

  /* organizer check */
  const user = await getUserWithRole();
  if (user.status !== "ready" || user.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }

  /* division */
  const div = await getDivisionById(divisionId);
  if (div.error) return { ok: false, error: div.error };
  if (!div.data) return { ok: false, error: "Division을 찾을 수 없습니다." };
  if (div.data.tournament_id !== tournamentId) {
    return { ok: false, error: "Division이 해당 대회에 속하지 않습니다." };
  }

  const groupSize = input.groupSize ?? div.data.group_size;
  if (groupSize < 2) {
    return { ok: false, error: "group_size는 2 이상이어야 합니다." };
  }

  /* approved teams */
  const teamsResult = await listApprovedTeamsByDivision(tournamentId, divisionId);
  if (teamsResult.error) return { ok: false, error: teamsResult.error };

  const teams: PreviewTeam[] = teamsResult.data
    .map((t) => ({ teamId: t.team_id, teamName: t.team_name }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  if (teams.length < 2) {
    return { ok: false, error: "승인 팀이 2팀 이상 필요합니다." };
  }

  /* group assignment (순서대로 groupSize씩) */
  const groupCount = Math.ceil(teams.length / groupSize);
  const warnings: string[] = [];

  const groupsPreview: GroupPreview[] = Array.from(
    { length: groupCount },
    (_, i) => {
      const start = i * groupSize;
      const groupTeams = teams.slice(start, start + groupSize);
      const n = groupTeams.length;
      const matchCount = (n * (n - 1)) / 2;

      if (n < groupSize && groupCount > 1) {
        warnings.push(
          `${makeGroupName(i)}: 팀 수(${n})가 그룹 크기(${groupSize})보다 적습니다.`
        );
      }

      return {
        groupIndex: i + 1,
        groupName: makeGroupName(i),
        teams: groupTeams,
        matchCount,
      };
    }
  );

  if (groupCount === 1 && teams.length <= groupSize) {
    warnings.push("조 1개로 생성됩니다.");
  }

  const totalMatches = groupsPreview.reduce((s, g) => s + g.matchCount, 0);

  return {
    ok: true,
    division: { id: div.data.id, name: div.data.name, groupSize },
    teams,
    groupsPreview,
    totals: {
      teamCount: teams.length,
      groupCount,
      matchCount: totalMatches,
    },
    warnings,
  };
}
