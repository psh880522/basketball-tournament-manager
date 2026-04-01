import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { requireOrganizer } from "@/src/lib/auth/guards";
import { listApprovedTeamsByDivision } from "@/lib/api/applications";
import type { ApiResult } from "@/lib/types/api";

export type Division = {
  id: string;
  tournament_id: string;
  name: string;
  group_size: number;
};

export type GroupRow = {
  id: string;
  division_id: string;
  name: string;
  order: number;
  type: string;
};

export type TeamRow = {
  id: string;
  team_name: string;
  division_id: string | null;
};

export type BracketMatchSummary = {
  id: string;
  teamAName: string;
  teamBName: string;
  isAssigned: boolean;
  seedA: number | null;
  seedB: number | null;
};

export type BracketGroupSummary = {
  name: string;
  order: number;
  matches: BracketMatchSummary[];
};

export type BracketTournamentRoundSummary = {
  groupId: string;
  roundName: string;
  roundOrder: number;
  matches: BracketMatchSummary[];
};

export type BracketDivisionSummary = {
  id: string;
  name: string;
  group_size: number;
  tournament_size: number | null;
  leagueMatchCount: number;
  tournamentMatchCount: number;
  hasLeagueMatches: boolean;
  hasTournamentMatches: boolean;
  hasUnassignedTournament: boolean;
  readyForSchedule: boolean;
  groups: BracketGroupSummary[];
  tournamentRounds: BracketTournamentRoundSummary[];
};

export type BracketGenerationSummary = {
  tournamentName: string;
  divisions: BracketDivisionSummary[];
};

type TournamentStatus = "draft" | "open" | "closed";

type CountResult = {
  count: number;
  error: string | null;
};

export async function getDivisionById(
  divisionId: string
): Promise<ApiResult<Division>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("divisions")
    .select("id,tournament_id,name,group_size")
    .eq("id", divisionId)
    .maybeSingle();

  return { data, error: error ? error.message : null };
}

export async function getDivisionsByTournament(
  tournamentId: string
): Promise<ApiResult<Division[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("divisions")
    .select("id,tournament_id,name,group_size")
    .eq("tournament_id", tournamentId)
    .order("name", { ascending: true });

  return { data, error: error ? error.message : null };
}

export async function getTournamentStatus(
  tournamentId: string
): Promise<ApiResult<{ id: string; status: TournamentStatus }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,status")
    .eq("id", tournamentId)
    .maybeSingle();

  return { data: data as { id: string; status: TournamentStatus } | null, error: error ? error.message : null };
}

export async function getApprovedTeamsByDivision(
  divisionId: string,
  tournamentId?: string
): Promise<ApiResult<TeamRow[]>> {
  if (tournamentId) {
    const { data, error } = await listApprovedTeamsByDivision(tournamentId, divisionId);
    if (error) return { data: null, error };

    const rows: TeamRow[] = (data ?? []).map((r) => ({
      id: r.team_id,
      team_name: r.team_name,
      division_id: divisionId,
    })).sort((a, b) => a.team_name.localeCompare(b.team_name));

    return { data: rows, error: null };
  }

  // tournamentId ?占쎌씠 ?占쎌텧 ??吏곸젒 荑쇰━ (?占쎌쐞 ?占쏀솚)
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournament_team_applications")
    .select("team_id, teams(id, team_name)")
    .eq("division_id", divisionId)
    .eq("status", "approved");

  if (error) return { data: null, error: error.message };

  const rows: TeamRow[] = ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const team = row.teams as { id: string; team_name: string } | null;
      if (!team) return null;
      return { id: team.id, team_name: team.team_name, division_id: divisionId };
    })
    .filter((team): team is NonNullable<typeof team> => team !== null)
    .sort((a, b) => a.team_name.localeCompare(b.team_name));

  return { data: rows, error: null };
}

export async function countGroupsByDivision(
  divisionId: string
): Promise<CountResult> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId);

  return { count: count ?? 0, error: error ? error.message : null };
}

export async function countMatchesByDivision(
  divisionId: string
): Promise<CountResult> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId);

  return { count: count ?? 0, error: error ? error.message : null };
}

export async function createGroups(
  divisionId: string,
  groups: { name: string; order: number; type?: string }[]
): Promise<ApiResult<GroupRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("groups")
    .insert(
      groups.map((group) => ({
        division_id: divisionId,
        name: group.name,
        order: group.order,
        type: group.type ?? "league",
      }))
    )
    .select("id,division_id,name,order,type");

  return { data, error: error ? error.message : null };
}

export async function createGroupTeams(
  entries: { group_id: string; team_id: string }[]
): Promise<ApiResult<{ group_id: string; team_id: string }[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("group_teams")
    .insert(entries)
    .select("group_id,team_id");

  return { data: data as { group_id: string; team_id: string }[] | null, error: error ? error.message : null };
}

export async function createMatches(
  entries: {
    tournament_id: string;
    division_id: string;
    group_id: string | null;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
    court_id: string | null;
  }[]
): Promise<ApiResult<{ id: string }[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .insert(entries)
    .select("id");

  return { data: data as { id: string }[] | null, error: error ? error.message : null };
}

export async function createLeagueMatches(input: {
  tournamentId: string;
  divisionId: string;
  groupSize: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId, groupSize } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!groupSize || groupSize < 2) {
    return { ok: false, error: "그룹 크기는 2 이상이어야 합니다." };
  }

  const divisionResult = await getDivisionById(divisionId);
  if (divisionResult.error) return { ok: false, error: divisionResult.error };
  if (!divisionResult.data) {
    return { ok: false, error: "Division을 찾을 수 없습니다." };
  }
  if (divisionResult.data.tournament_id !== tournamentId) {
    return { ok: false, error: "Division이 대회에 속하지 않습니다." };
  }

  const existingMatches = await countMatchesByDivision(divisionId);
  if (existingMatches.error) {
    return { ok: false, error: existingMatches.error };
  }
  if (existingMatches.count > 0) {
    return { ok: false, error: "이미 생성된 경기가 있습니다." };
  }

  const teamsResult = await getApprovedTeamsByDivision(divisionId, tournamentId);
  if (teamsResult.error) return { ok: false, error: teamsResult.error };
  const teams = teamsResult.data ?? [];
  if (teams.length < 2) {
    return { ok: false, error: "승인된 팀이 2개 이상 필요합니다." };
  }

  const groupCount = Math.ceil(teams.length / groupSize);
  const groupDefs = Array.from({ length: groupCount }, (_, i) => ({
    name: `${String.fromCharCode(65 + i)}조`,
    order: i + 1,
  }));

  const groupsResult = await createGroups(divisionId, groupDefs);
  if (groupsResult.error) return { ok: false, error: groupsResult.error };
  const groups = (groupsResult.data ?? []).sort((a, b) => a.order - b.order);
  if (groups.length === 0) {
    return { ok: false, error: "조 생성에 실패했습니다." };
  }

  const groupTeams: { group_id: string; team_id: string }[] = [];
  const teamsByGroup: Record<string, string[]> = {};

  teams.forEach((team, index) => {
    const groupIndex = Math.floor(index / groupSize);
    const group = groups[Math.min(groupIndex, groups.length - 1)];
    if (!group) return;
    groupTeams.push({ group_id: group.id, team_id: team.id });
    if (!teamsByGroup[group.id]) teamsByGroup[group.id] = [];
    teamsByGroup[group.id].push(team.id);
  });

  const groupTeamsResult = await createGroupTeams(groupTeams);
  if (groupTeamsResult.error) {
    return { ok: false, error: groupTeamsResult.error };
  }

  const matchEntries: {
    tournament_id: string;
    division_id: string;
    group_id: string | null;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
    court_id: string | null;
  }[] = [];

  for (const [groupId, teamIds] of Object.entries(teamsByGroup)) {
    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        matchEntries.push({
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

  if (matchEntries.length === 0) {
    return { ok: false, error: "생성할 경기가 없습니다." };
  }

  const matchResult = await createMatches(matchEntries);
  if (matchResult.error) return { ok: false, error: matchResult.error };

  return { ok: true };
}

export async function createTournamentMatches(input: {
  tournamentId: string;
  divisionId: string;
  tournamentSize: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId, tournamentSize } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const allowedSizes = [4, 8, 16];
  if (!allowedSizes.includes(tournamentSize)) {
    return { ok: false, error: "토너먼트 크기는 4/8/16만 허용됩니다." };
  }

  const divisionResult = await getDivisionById(divisionId);
  if (divisionResult.error) return { ok: false, error: divisionResult.error };
  if (!divisionResult.data) {
    return { ok: false, error: "Division을 찾을 수 없습니다." };
  }
  if (divisionResult.data.tournament_id !== tournamentId) {
    return { ok: false, error: "Division이 대회에 속하지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { count: existingGroups, error: groupErr } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId)
    .eq("type", "tournament");

  if (groupErr) return { ok: false, error: groupErr.message };
  if ((existingGroups ?? 0) > 0) {
    return { ok: false, error: "이미 토너먼트 경기가 존재합니다." };
  }

  const { error: updateDivisionErr } = await supabase
    .from("divisions")
    .update({ tournament_size: tournamentSize })
    .eq("id", divisionId);

  if (updateDivisionErr) {
    return { ok: false, error: updateDivisionErr.message };
  }

  const roundStructure: { name: string; matchCount: number }[] = (() => {
    if (tournamentSize === 4) {
      return [
        { name: "semifinal", matchCount: 2 },
        { name: "final", matchCount: 1 },
        { name: "third_place", matchCount: 1 },
      ];
    }
    if (tournamentSize === 8) {
      return [
        { name: "quarterfinal", matchCount: 4 },
        { name: "semifinal", matchCount: 2 },
        { name: "final", matchCount: 1 },
        { name: "third_place", matchCount: 1 },
      ];
    }
    return [
      { name: "round_of_16", matchCount: 8 },
      { name: "quarterfinal", matchCount: 4 },
      { name: "semifinal", matchCount: 2 },
      { name: "final", matchCount: 1 },
      { name: "third_place", matchCount: 1 },
    ];
  })();

  const roundOrder: Record<string, number> = {
    round_of_16: 1,
    quarterfinal: 2,
    semifinal: 3,
    final: 4,
    third_place: 5,
  };

  const groupDefs = roundStructure.map((round) => ({
    name: round.name,
    order: roundOrder[round.name] ?? 999,
    type: "tournament",
  }));

  const groupsResult = await createGroups(divisionId, groupDefs);
  if (groupsResult.error) return { ok: false, error: groupsResult.error };
  const groups = (groupsResult.data ?? []).sort((a, b) => a.order - b.order);

  if (groups.length === 0) {
    return { ok: false, error: "토너먼트 그룹 생성에 실패했습니다." };
  }

  const matchEntries: {
    tournament_id: string;
    division_id: string;
    group_id: string | null;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
    court_id: string | null;
  }[] = [];

  roundStructure.forEach((round) => {
    const group = groups.find((g) => g.name === round.name);
    if (!group) return;
    for (let i = 0; i < round.matchCount; i += 1) {
      matchEntries.push({
        tournament_id: tournamentId,
        division_id: divisionId,
        group_id: group.id,
        team_a_id: null,
        team_b_id: null,
        status: "scheduled",
        court_id: null,
      });
    }
  });

  if (matchEntries.length === 0) {
    return { ok: false, error: "생성할 경기가 없습니다." };
  }

  const matchResult = await createMatches(matchEntries);
  if (matchResult.error) return { ok: false, error: matchResult.error };

  return { ok: true };
}

export async function getBracketGenerationSummary(
  tournamentId: string
): Promise<ApiResult<BracketGenerationSummary>> {
  const supabase = await createSupabaseServerClient();

  const { data: tournament, error: tournamentErr } = await supabase
    .from("tournaments")
    .select("id,name")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentErr) return { data: null, error: tournamentErr.message };
  if (!tournament) return { data: null, error: "대회를 찾을 수 없습니다." };

  const { data: divisions, error: divisionsErr } = await supabase
    .from("divisions")
    .select("id,name,group_size,tournament_size,sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (divisionsErr) return { data: null, error: divisionsErr.message };

  const { data: matches, error: matchesErr } = await supabase
    .from("matches")
    .select(
      "id,division_id,group_id,seed_a,seed_b,team_a_id,team_b_id,groups(id,name,order,type),team_a:teams!matches_team_a_id_fkey(team_name),team_b:teams!matches_team_b_id_fkey(team_name)"
    )
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (matchesErr) return { data: null, error: matchesErr.message };

  const divisionMap = new Map<string, BracketDivisionSummary>();
  (divisions ?? []).forEach((division) => {
    divisionMap.set(division.id, {
      id: division.id as string,
      name: division.name as string,
      group_size: (division.group_size as number) ?? 2,
      tournament_size: (division.tournament_size as number | null) ?? null,
      leagueMatchCount: 0,
      tournamentMatchCount: 0,
      hasLeagueMatches: false,
      hasTournamentMatches: false,
      hasUnassignedTournament: false,
      readyForSchedule: false,
      groups: [],
      tournamentRounds: [],
    });
  });

  const groupBuckets = new Map<string, Map<string, BracketGroupSummary>>();
  const tournamentBuckets = new Map<string, Map<string, BracketTournamentRoundSummary>>();

  (matches ?? []).forEach((row) => {
    const divisionId = row.division_id as string;
    const summary = divisionMap.get(divisionId);
    if (!summary) return;

    const teamA = (row.team_a as unknown) as { team_name: string } | null;
    const teamB = (row.team_b as unknown) as { team_name: string } | null;
    const isAssigned = Boolean(row.team_a_id) && Boolean(row.team_b_id);
    const matchSummary: BracketMatchSummary = {
      id: row.id as string,
      teamAName: teamA?.team_name ?? "TBD",
      teamBName: teamB?.team_name ?? "TBD",
      isAssigned,
      seedA: (row.seed_a as number | null) ?? null,
      seedB: (row.seed_b as number | null) ?? null,
    };

    const groupMeta = (row.groups as unknown) as
      | { id: string; name: string; order: number; type: string }
      | null;
    if (groupMeta?.type !== "tournament") {
      summary.leagueMatchCount += 1;
      const groupName = groupMeta?.name ?? "미지정 조";
      const groupOrder = groupMeta?.order ?? 999;
      if (!groupBuckets.has(divisionId)) {
        groupBuckets.set(divisionId, new Map());
      }
      const groupMap = groupBuckets.get(divisionId) as Map<string, BracketGroupSummary>;
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, { name: groupName, order: groupOrder, matches: [] });
      }
      groupMap.get(groupName)?.matches.push(matchSummary);
    } else {
      summary.tournamentMatchCount += 1;
      if (!isAssigned) summary.hasUnassignedTournament = true;
      const roundName = groupMeta?.name ?? "tournament";
      const roundId = groupMeta?.id ?? roundName;
      const roundOrder = groupMeta?.order ?? 999;
      if (!tournamentBuckets.has(divisionId)) {
        tournamentBuckets.set(divisionId, new Map());
      }
      const roundMap = tournamentBuckets.get(divisionId) as Map<
        string,
        BracketTournamentRoundSummary
      >;
      if (!roundMap.has(roundId)) {
        roundMap.set(roundId, {
          groupId: roundId,
          roundName,
          roundOrder,
          matches: [],
        });
      }
      roundMap.get(roundId)?.matches.push(matchSummary);
    }
  });

  divisionMap.forEach((summary, divisionId) => {
    summary.hasLeagueMatches = summary.leagueMatchCount > 0;
    summary.hasTournamentMatches = summary.tournamentMatchCount > 0;
    summary.readyForSchedule = summary.hasLeagueMatches || summary.hasTournamentMatches;

    const groups = groupBuckets.get(divisionId);
    summary.groups = groups
      ? [...groups.values()].sort((a, b) => a.order - b.order)
      : [];

    const rounds = tournamentBuckets.get(divisionId);
    summary.tournamentRounds = rounds
      ? [...rounds.values()].sort((a, b) => a.roundOrder - b.roundOrder)
      : [];
  });

  return {
    data: {
      tournamentName: tournament.name as string,
      divisions: [...divisionMap.values()],
    },
    error: null,
  };
}
