import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { setDivisionStandingsDirty } from "@/lib/api/divisions";
import { replaceDivisionStandings } from "@/lib/api/standings";
import {
  compareTournamentMatchOrder,
} from "@/lib/formatters/tournamentMatchOrder";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

type DivisionRow = {
  id: string;
  tournament_id: string;
};

type DivisionSeedingRow = {
  id: string;
  tournament_id: string;
  standings_dirty: boolean;
  tournament_size: number | null;
  include_tournament_slots: boolean;
};

export type LeagueMatchRow = {
  id: string;
  division_id: string;
  stage_type: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  scheduled_at: string | null;
  group_id: string | null;
  court_id: string | null;
  team_a_id: string;
  team_b_id: string;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  court: { id: string; name: string } | null;
  group: { id: string; name: string; order: number; type: string } | null;
};

export type LeagueStandingRow = {
  id: string;
  team_id: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  points_diff: number;
  rank: number;
  teams: { team_name: string } | null;
};

export type TournamentMatchRow = {
  id: string;
  division_id: string;
  group_id: string | null;
  group: { id: string; name: string; order: number; type: string } | null;
  seed_a: number | null;
  seed_b: number | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  scheduled_at: string | null;
  court_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  created_at: string;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  court: { id: string; name: string } | null;
};

export type TournamentProgressMatch = {
  id: string;
  round: string;
  teamAName: string | null;
  teamBName: string | null;
  status: string;
  winnerTeamId: string | null;
  nextRound: string | null;
  nextSlot: "A" | "B" | null;
  nextAssignedTeamId: string | null;
  isFinal: boolean;
};

export type TournamentProgressRound = {
  round: string;
  label: string;
  matches: TournamentProgressMatch[];
};

export type TournamentProgress = {
  rounds: TournamentProgressRound[];
  finalCompleted: boolean;
};

export type SeedingPreviewRow = {
  seedA: number;
  seedB: number;
  teamAName: string | null;
  teamBName: string | null;
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

async function requireOrganizer(): Promise<ActionResult> {
  const auth = await getUserWithRole();
  if (auth.status !== "ready" || auth.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }
  return { ok: true };
}

async function getDivision(divisionId: string): Promise<ApiResult<DivisionRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("divisions")
    .select("id,tournament_id")
    .eq("id", divisionId)
    .maybeSingle();

  return {
    data: data as DivisionRow | null,
    error: error ? error.message : null,
  };
}

async function getDivisionForSeeding(
  divisionId: string
): Promise<ApiResult<DivisionSeedingRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("divisions")
    .select("id,tournament_id,standings_dirty,tournament_size,include_tournament_slots")
    .eq("id", divisionId)
    .maybeSingle();

  return {
    data: data as DivisionSeedingRow | null,
    error: error ? error.message : null,
  };
}

const roundByTournamentSize: Record<number, string> = {
  4: "semifinal",
  8: "quarterfinal",
  16: "round_of_16",
};

const nextRoundMap: Record<string, string | null> = {
  round_of_16: "quarterfinal",
  quarterfinal: "semifinal",
  semifinal: "final",
  final: null,
  third_place: null,
};

const roundLabelMap: Record<string, string> = {
  round_of_16: "16강",
  quarterfinal: "8강",
  semifinal: "4강",
  final: "결승",
  third_place: "3/4위전",
};

const buildSeedPairs = (size: number) => {
  const pairs: { seedA: number; seedB: number }[] = [];
  for (let i = 1; i <= size / 2; i += 1) {
    pairs.push({ seedA: i, seedB: size - i + 1 });
  }
  return pairs;
};

export async function listLeagueMatchesByDivision(
  divisionId: string
): Promise<ApiResult<LeagueMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,division_id,group_id,court_id,scheduled_at,status,score_a,score_b,team_a_id,team_b_id,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name),court:courts!matches_court_id_fkey(id,name),group:groups!matches_group_id_fkey!inner(id,name,order,type)"
    )
    .eq("division_id", divisionId)
    .eq("group.type", "league")
    .order("created_at", { ascending: true });

  const rows = (data as LeagueMatchRow[] | null) ?? null;
  const decorated = rows
    ? rows.map((row) => ({
        ...row,
        stage_type: row.group?.type === "tournament" ? "tournament" : "group",
      }))
    : null;

  return {
    data: decorated,
    error: error ? error.message : null,
  };
}

export async function listLeagueMatchesForResult(
  tournamentId: string,
  filters?: {
    divisionId?: string;
    courtId?: string;
  }
): Promise<ApiResult<LeagueMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("matches")
    .select(
      "id,division_id,group_id,court_id,scheduled_at,status,score_a,score_b,team_a_id,team_b_id,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name),court:courts!matches_court_id_fkey(id,name),group:groups!matches_group_id_fkey!inner(id,name,order,type)"
    )
    .eq("tournament_id", tournamentId)
    .eq("group.type", "league")
    .order("created_at", { ascending: true });

  if (filters?.divisionId) {
    query = query.eq("division_id", filters.divisionId);
  }

  if (filters?.courtId) {
    query = query.eq("court_id", filters.courtId);
  }

  const { data, error } = await query;
  const rows = (data as LeagueMatchRow[] | null) ?? null;
  const decorated = rows
    ? rows.map((row) => ({
        ...row,
        stage_type: row.group?.type === "tournament" ? "tournament" : "group",
      }))
    : null;

  return {
    data: decorated,
    error: error ? error.message : null,
  };
}

export async function getLeagueStandings(
  divisionId: string
): Promise<ApiResult<LeagueStandingRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("standings")
    .select(
      "id,team_id,wins,losses,points_for,points_against,points_diff,rank,teams(team_name)"
    )
    .eq("division_id", divisionId)
    .is("group_id", null)
    .order("rank", { ascending: true });

  return {
    data: data as LeagueStandingRow[] | null,
    error: error ? error.message : null,
  };
}

export async function listTournamentMatchesByDivision(
  divisionId: string
): Promise<ApiResult<TournamentMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,division_id,group_id,seed_a,seed_b,group:groups!matches_group_id_fkey!inner(id,name,order,type),status,score_a,score_b,scheduled_at,court_id,team_a_id,team_b_id,winner_team_id,created_at,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name),court:courts!matches_court_id_fkey(id,name)"
    )
    .eq("division_id", divisionId)
    .eq("group.type", "tournament")
    .order("created_at", { ascending: true });

  return {
    data: data as TournamentMatchRow[] | null,
    error: error ? error.message : null,
  };
}

export async function getTournamentBracketProgress(
  divisionId: string
): Promise<ApiResult<TournamentProgress>> {
  if (!divisionId) return { data: null, error: null };

  const matchesResult = await listTournamentMatchesByDivision(divisionId);
  if (matchesResult.error) return { data: null, error: matchesResult.error };
  const matches = matchesResult.data ?? [];
  if (matches.length === 0) return { data: { rounds: [], finalCompleted: false }, error: null };

  const roundMap = new Map<string, TournamentMatchRow[]>();
  const roundOrder = new Map<string, number>();

  matches.forEach((match) => {
    const groupName = match.group?.name ?? "";
    if (!groupName) return;
    if (!roundMap.has(groupName)) {
      roundMap.set(groupName, []);
    }
    roundMap.get(groupName)?.push(match);
    if (!roundOrder.has(groupName)) {
      roundOrder.set(groupName, match.group?.order ?? 999);
    }
  });

  const progressRounds: TournamentProgressRound[] = [];
  const orderedRounds = [...roundMap.keys()].sort((a, b) => {
    const orderA = roundOrder.get(a) ?? 999;
    const orderB = roundOrder.get(b) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  orderedRounds.forEach((round) => {
    const roundMatches = roundMap.get(round) ?? [];
    if (roundMatches.length === 0) return;

    const nextRound = nextRoundMap[round] ?? null;
    const nextMatches = nextRound ? roundMap.get(nextRound) ?? [] : [];

    const roundProgressMatches: TournamentProgressMatch[] = roundMatches.map(
      (match, index) => {
        const winnerTeamId = match.winner_team_id ?? null;
        let nextSlot: "A" | "B" | null = null;
        let nextAssignedTeamId: string | null = null;

        if (nextRound && nextMatches.length > 0) {
          const nextMatch = nextMatches[Math.floor(index / 2)];
          nextSlot = index % 2 === 0 ? "A" : "B";
          if (nextMatch) {
            nextAssignedTeamId =
              nextSlot === "A" ? nextMatch.team_a_id ?? null : nextMatch.team_b_id ?? null;
          }
        }

        return {
          id: match.id,
          round,
          teamAName: match.team_a?.team_name ?? null,
          teamBName: match.team_b?.team_name ?? null,
          status: match.status,
          winnerTeamId,
          nextRound,
          nextSlot,
          nextAssignedTeamId,
          isFinal: round === "final",
        };
      }
    );

    progressRounds.push({
      round,
      label: roundLabelMap[round] ?? round,
      matches: roundProgressMatches,
    });
  });

  const finalMatches = roundMap.get("final") ?? [];
  const finalCompleted = finalMatches.some((match) => match.status === "completed");

  return {
    data: { rounds: progressRounds, finalCompleted },
    error: null,
  };
}

export async function saveTournamentResult(input: {
  matchId: string;
  scoreA: number;
  scoreB: number;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { matchId, scoreA, scoreB } = input;
  if (!matchId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!Number.isInteger(scoreA) || scoreA < 0) {
    return { ok: false, error: "scoreA가 올바르지 않습니다." };
  }
  if (!Number.isInteger(scoreB) || scoreB < 0) {
    return { ok: false, error: "scoreB가 올바르지 않습니다." };
  }
  if (scoreA === scoreB) {
    return { ok: false, error: "무승부는 허용되지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select(
      "id,division_id,group_id,group:groups!matches_group_id_fkey!inner(id,name,order,type),team_a_id,team_b_id,team_a:teams!matches_team_a_id_fkey(team_name),team_b:teams!matches_team_b_id_fkey(team_name)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr) return { ok: false, error: matchErr.message };
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." };
  const matchRow = match as unknown as {
    id: string;
    division_id: string;
    group_id: string | null;
    group: { id: string; name: string; order: number; type: string } | null;
    team_a_id: string | null;
    team_b_id: string | null;
    team_a: { team_name: string } | null;
    team_b: { team_name: string } | null;
  };
  if (!matchRow.group || matchRow.group.type !== "tournament") {
    return { ok: false, error: "토너먼트 경기가 아닙니다." };
  }
  if (!matchRow.group.name) {
    return { ok: false, error: "라운드 정보를 찾을 수 없습니다." };
  }

  const winnerTeamId = scoreA > scoreB ? matchRow.team_a_id : matchRow.team_b_id;
  const loserTeamId = scoreA > scoreB ? matchRow.team_b_id : matchRow.team_a_id;
  if (!winnerTeamId) {
    return { ok: false, error: "승자 팀을 찾을 수 없습니다." };
  }

  const { error: updateErr } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      status: "completed",
      winner_team_id: winnerTeamId,
    })
    .eq("id", matchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  const currentRound = matchRow.group.name;
  const nextRound = nextRoundMap[currentRound] ?? null;

  if (!nextRound) {
    if (currentRound === "final") {
      return { ok: true, message: "우승 팀이 확정되었습니다." };
    }
    return { ok: true, message: "저장 완료" };
  }

  const { data: roundGroups, error: roundGroupsErr } = await supabase
    .from("groups")
    .select("name,order")
    .eq("division_id", matchRow.division_id)
    .eq("type", "tournament")
    .order("order", { ascending: true });

  if (roundGroupsErr) return { ok: false, error: roundGroupsErr.message };

  const initialRound = (roundGroups ?? [])[0]?.name ?? null;

  const { data: currentMatches, error: currentErr } = await supabase
    .from("matches")
    .select("id,seed_a,seed_b,created_at")
    .eq("division_id", matchRow.division_id)
    .eq("group_id", matchRow.group.id);

  if (currentErr) return { ok: false, error: currentErr.message };
  const orderedCurrent = (currentMatches ?? [])
    .map((row) => ({
      id: row.id as string,
      groupName: matchRow.group?.name ?? null,
      seedA: (row.seed_a as number | null) ?? null,
      seedB: (row.seed_b as number | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    }))
    .sort((left, right) =>
      compareTournamentMatchOrder(left, right, initialRound)
    );

  const currentIndex = orderedCurrent.findIndex((row) => row.id === matchId);
  if (currentIndex < 0) {
    return { ok: false, error: "현재 경기 순서를 찾을 수 없습니다." };
  }

  const { data: nextGroup, error: nextGroupErr } = await supabase
    .from("groups")
    .select("id")
    .eq("division_id", matchRow.division_id)
    .eq("type", "tournament")
    .eq("name", nextRound)
    .maybeSingle();

  if (nextGroupErr) return { ok: false, error: nextGroupErr.message };
  if (!nextGroup) {
    return { ok: false, error: "다음 라운드 그룹을 찾을 수 없습니다." };
  }

  const { data: nextMatches, error: nextErr } = await supabase
    .from("matches")
    .select("id,team_a_id,team_b_id,seed_a,seed_b,created_at")
    .eq("division_id", matchRow.division_id)
    .eq("group_id", nextGroup.id);

  if (nextErr) return { ok: false, error: nextErr.message };
  const orderedNext = (nextMatches ?? [])
    .map((row) => ({
      id: row.id as string,
      groupName: nextRound,
      seedA: (row.seed_a as number | null) ?? null,
      seedB: (row.seed_b as number | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
      team_a_id: row.team_a_id as string | null,
      team_b_id: row.team_b_id as string | null,
    }))
    .sort((left, right) =>
      compareTournamentMatchOrder(left, right, initialRound)
    );

  const nextMatch = orderedNext[Math.floor(currentIndex / 2)];
  if (!nextMatch) {
    return { ok: false, error: "다음 라운드 경기를 찾을 수 없습니다." };
  }

  const slotKey = currentIndex % 2 === 0 ? "team_a_id" : "team_b_id";
  const existingTeamId = nextMatch[slotKey as "team_a_id" | "team_b_id"];
  if (existingTeamId && existingTeamId !== winnerTeamId) {
    return { ok: false, error: "다음 라운드 슬롯에 이미 다른 팀이 배치되어 있습니다." };
  }

  if (!existingTeamId) {
    const { error: nextUpdateErr } = await supabase
      .from("matches")
      .update({ [slotKey]: winnerTeamId })
      .eq("id", nextMatch.id);

    if (nextUpdateErr) return { ok: false, error: nextUpdateErr.message };
  }

  let thirdPlaceMessage = "";
  if (currentRound === "semifinal" && loserTeamId) {
    const { data: thirdGroup, error: thirdGroupErr } = await supabase
      .from("groups")
      .select("id")
      .eq("division_id", matchRow.division_id)
      .eq("type", "tournament")
      .eq("name", "third_place")
      .maybeSingle();

    if (thirdGroupErr) return { ok: false, error: thirdGroupErr.message };
    if (!thirdGroup) return { ok: false, error: "3/4위전 그룹을 찾을 수 없습니다." };

    const { data: thirdMatches, error: thirdErr } = await supabase
      .from("matches")
      .select("id,team_a_id,team_b_id,seed_a,seed_b,created_at")
      .eq("division_id", matchRow.division_id)
      .eq("group_id", thirdGroup.id);

    if (thirdErr) return { ok: false, error: thirdErr.message };
    const orderedThird = (thirdMatches ?? [])
      .map((row) => ({
        id: row.id as string,
        groupName: "third_place",
        seedA: (row.seed_a as number | null) ?? null,
        seedB: (row.seed_b as number | null) ?? null,
        createdAt: (row.created_at as string | null) ?? null,
        team_a_id: row.team_a_id as string | null,
        team_b_id: row.team_b_id as string | null,
      }))
      .sort((left, right) =>
        compareTournamentMatchOrder(left, right, initialRound)
      );

    const thirdMatch = orderedThird[Math.floor(currentIndex / 2)];
    if (thirdMatch) {
      const thirdSlotKey = currentIndex % 2 === 0 ? "team_a_id" : "team_b_id";
      const thirdExisting = thirdMatch[thirdSlotKey as "team_a_id" | "team_b_id"];
      if (thirdExisting && thirdExisting !== loserTeamId) {
        return { ok: false, error: "3/4위전 슬롯에 이미 다른 팀이 배치되어 있습니다." };
      }
      if (!thirdExisting) {
        const { error: thirdUpdateErr } = await supabase
          .from("matches")
          .update({ [thirdSlotKey]: loserTeamId })
          .eq("id", thirdMatch.id);

        if (thirdUpdateErr) return { ok: false, error: thirdUpdateErr.message };
      }

      const loserName =
        loserTeamId === matchRow.team_a_id
          ? matchRow.team_a?.team_name ?? "패자"
          : matchRow.team_b?.team_name ?? "패자";
      const thirdSlotLabel = thirdSlotKey === "team_a_id" ? "1" : "2";
      thirdPlaceMessage = `, 패자 ${loserName}가 3/4위전 슬롯 ${thirdSlotLabel}에 배치되었습니다`;
    }
  }

  const winnerName =
    winnerTeamId === matchRow.team_a_id
      ? matchRow.team_a?.team_name ?? "승자"
      : matchRow.team_b?.team_name ?? "승자";
  const roundLabel = roundLabelMap[nextRound] ?? nextRound;
  const slotLabel = slotKey === "team_a_id" ? "1" : "2";

  return {
    ok: true,
    message: `승자 ${winnerName}가 ${roundLabel} 슬롯 ${slotLabel}에 자동 배치되었습니다${thirdPlaceMessage}`,
  };
}

export async function confirmLeagueStandings(
  divisionId: string
): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  if (!divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const divisionResult = await getDivisionForSeeding(divisionId);
  if (divisionResult.error) return { ok: false, error: divisionResult.error };
  if (!divisionResult.data) {
    return { ok: false, error: "Division을 찾을 수 없습니다." };
  }

  if (divisionResult.data.standings_dirty) {
    return { ok: false, error: "순위 재계산이 필요합니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: standings, error: standingsErr } = await supabase
    .from("standings")
    .select("id")
    .eq("division_id", divisionId)
    .is("group_id", null)
    .limit(1);

  if (standingsErr) return { ok: false, error: standingsErr.message };
  if (!standings || standings.length === 0) {
    return { ok: false, error: "확정할 순위가 없습니다." };
  }

  const { error: updateErr } = await supabase
    .from("divisions")
    .update({ include_tournament_slots: true })
    .eq("id", divisionId);

  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true };
}

export async function getTournamentSeedingPreview(
  divisionId: string
): Promise<ApiResult<SeedingPreviewRow[]>> {
  if (!divisionId) return { data: null, error: null };

  const divisionResult = await getDivisionForSeeding(divisionId);
  if (divisionResult.error) return { data: null, error: divisionResult.error };
  if (!divisionResult.data) return { data: null, error: "Division을 찾을 수 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { data: roundGroups, error: roundGroupErr } = await supabase
    .from("groups")
    .select("id,name,order")
    .eq("division_id", divisionId)
    .eq("type", "tournament")
    .order("order", { ascending: true });

  if (roundGroupErr) return { data: null, error: roundGroupErr.message };
  const firstGroup = (roundGroups ?? [])[0] as { id: string } | undefined;
  if (!firstGroup) return { data: null, error: "토너먼트 그룹이 없습니다." };

  const { data: roundMatches, error: roundErr } = await supabase
    .from("matches")
    .select("id")
    .eq("division_id", divisionId)
    .eq("group_id", firstGroup.id);

  if (roundErr) return { data: null, error: roundErr.message };

  const tournamentSize = (roundMatches ?? []).length * 2;
  if (tournamentSize <= 0) {
    return { data: null, error: "토너먼트 매치가 없습니다." };
  }
  const { data: standings, error: standingsErr } = await supabase
    .from("standings")
    .select("team_id,rank,teams(team_name)")
    .eq("division_id", divisionId)
    .is("group_id", null)
    .order("rank", { ascending: true })
    .limit(tournamentSize);

  if (standingsErr) return { data: null, error: standingsErr.message };

  const rows = (standings ?? []) as unknown as {
    team_id: string;
    rank: number;
    teams: { team_name: string } | null;
  }[];

  if (rows.length === 0) return { data: [], error: null };

  const bySeed = new Map<number, (typeof rows)[number]>();
  rows.forEach((row) => {
    if (row.rank) bySeed.set(row.rank, row);
  });

  const preview = buildSeedPairs(tournamentSize).map((pair) => ({
    seedA: pair.seedA,
    seedB: pair.seedB,
    teamAName: bySeed.get(pair.seedA)?.teams?.team_name ?? null,
    teamBName: bySeed.get(pair.seedB)?.teams?.team_name ?? null,
  }));

  return { data: preview, error: null };
}

export async function seedTournamentTeamsFromConfirmedStandings(
  divisionId: string
): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  if (!divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const divisionResult = await getDivisionForSeeding(divisionId);
  if (divisionResult.error) return { ok: false, error: divisionResult.error };
  if (!divisionResult.data) {
    return { ok: false, error: "Division을 찾을 수 없습니다." };
  }

  const { standings_dirty, tournament_size, include_tournament_slots } =
    divisionResult.data;

  if (standings_dirty) {
    return { ok: false, error: "순위 재계산이 필요합니다." };
  }

  if (!include_tournament_slots) {
    return { ok: false, error: "리그 순위가 확정되지 않았습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: roundGroups, error: roundGroupErr } = await supabase
    .from("groups")
    .select("id,name,order")
    .eq("division_id", divisionId)
    .eq("type", "tournament")
    .order("order", { ascending: true });

  if (roundGroupErr) return { ok: false, error: roundGroupErr.message };
  const firstGroup = (roundGroups ?? [])[0] as { id: string } | undefined;
  if (!firstGroup) {
    return { ok: false, error: "토너먼트 그룹이 없습니다." };
  }

  const { data: roundMatches, error: roundErr } = await supabase
    .from("matches")
    .select("id,team_a_id,team_b_id,created_at")
    .eq("division_id", divisionId)
    .eq("group_id", firstGroup.id)
    .order("created_at", { ascending: true });

  if (roundErr) return { ok: false, error: roundErr.message };

  const matches = (roundMatches ?? []) as {
    id: string;
    team_a_id: string | null;
    team_b_id: string | null;
  }[];

  if (matches.length === 0) {
    return { ok: false, error: "토너먼트 매치가 없습니다." };
  }

  const size = matches.length * 2;

  const { data: standings, error: standingsErr } = await supabase
    .from("standings")
    .select("team_id,rank")
    .eq("division_id", divisionId)
    .is("group_id", null)
    .order("rank", { ascending: true })
    .limit(size);

  if (standingsErr) return { ok: false, error: standingsErr.message };
  const rows = (standings ?? []) as { team_id: string; rank: number }[];
  if (rows.length < size) {
    return { ok: false, error: "토너먼트에 필요한 순위 데이터가 부족합니다." };
  }

  const { data: existingMatches, error: existingErr } = await supabase
    .from("matches")
    .select("id,team_a_id,team_b_id,group:groups!matches_group_id_fkey!inner(type)")
    .eq("division_id", divisionId)
    .eq("group.type", "tournament");

  if (existingErr) return { ok: false, error: existingErr.message };
  const hasAssigned = (existingMatches ?? []).some(
    (match) => match.team_a_id || match.team_b_id
  );
  if (hasAssigned) {
    return { ok: false, error: "이미 팀이 배치된 토너먼트 경기가 있습니다." };
  }

  const pairs = buildSeedPairs(size);
  if (matches.length < pairs.length) {
    return { ok: false, error: "토너먼트 매치 수가 부족합니다." };
  }

  const seedMap = new Map<number, string>();
  rows.forEach((row) => {
    if (row.rank) seedMap.set(row.rank, row.team_id);
  });

  for (let i = 0; i < pairs.length; i += 1) {
    const match = matches[i];
    const pair = pairs[i];
    const teamAId = seedMap.get(pair.seedA);
    const teamBId = seedMap.get(pair.seedB);
    if (!teamAId || !teamBId) {
      return { ok: false, error: "시드 팀 정보를 찾을 수 없습니다." };
    }

    const { error: updateErr } = await supabase
      .from("matches")
      .update({ team_a_id: teamAId, team_b_id: teamBId })
      .eq("id", match.id);

    if (updateErr) return { ok: false, error: updateErr.message };
  }

  return { ok: true };
}

export async function saveLeagueResult(input: {
  matchId: string;
  scoreA: number;
  scoreB: number;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { matchId, scoreA, scoreB } = input;
  if (!matchId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!Number.isInteger(scoreA) || scoreA < 0) {
    return { ok: false, error: "scoreA가 올바르지 않습니다." };
  }
  if (!Number.isInteger(scoreB) || scoreB < 0) {
    return { ok: false, error: "scoreB가 올바르지 않습니다." };
  }
  if (scoreA === scoreB) {
    return { ok: false, error: "무승부는 허용되지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id,division_id,group_id,team_a_id,team_b_id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr) return { ok: false, error: matchErr.message };
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." };
  if (!match.group_id) {
    return { ok: false, error: "리그 경기가 아닙니다." };
  }

  const winnerTeamId = scoreA > scoreB ? match.team_a_id : match.team_b_id;
  const { error: updateErr } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      status: "completed",
      winner_team_id: winnerTeamId,
    })
    .eq("id", matchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  const dirtyResult = await setDivisionStandingsDirty(match.division_id, true);
  if (!dirtyResult.ok) return dirtyResult;

  return { ok: true };
}

export async function calculateLeagueStandings(
  divisionId: string
): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  if (!divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const divisionResult = await getDivision(divisionId);
  if (divisionResult.error) return { ok: false, error: divisionResult.error };
  if (!divisionResult.data) {
    return { ok: false, error: "Division을 찾을 수 없습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: matches, error: matchesErr } = await supabase
    .from("matches")
    .select(
      "id,team_a_id,team_b_id,score_a,score_b,winner_team_id,status,group_id"
    )
    .eq("division_id", divisionId)
    .not("group_id", "is", null)
    .eq("status", "completed");

  if (matchesErr) return { ok: false, error: matchesErr.message };

  const completedMatches = (matches ?? []).filter(
    (match) => match.score_a !== null && match.score_b !== null
  );

  if (completedMatches.length === 0) {
    return { ok: false, error: "완료된 리그 경기가 없습니다." };
  }

  const statsByTeam: Record<string, TeamStats> = {};

  for (const match of completedMatches) {
    const scoreA = match.score_a as number;
    const scoreB = match.score_b as number;

    if (!statsByTeam[match.team_a_id]) {
      statsByTeam[match.team_a_id] = {
        team_id: match.team_a_id,
        team_name: "-",
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
        team_name: "-",
        wins: 0,
        losses: 0,
        points_for: 0,
        points_against: 0,
        points_diff: 0,
      };
    }

    const teamA = statsByTeam[match.team_a_id];
    const teamB = statsByTeam[match.team_b_id];

    teamA.points_for += scoreA;
    teamA.points_against += scoreB;
    teamB.points_for += scoreB;
    teamB.points_against += scoreA;

    if (match.winner_team_id === match.team_a_id) {
      teamA.wins += 1;
      teamB.losses += 1;
    } else if (match.winner_team_id === match.team_b_id) {
      teamB.wins += 1;
      teamA.losses += 1;
    } else {
      return { ok: false, error: "승자 정보가 올바르지 않습니다." };
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
    const headToHeadWins = buildHeadToHeadWins(teamIds, completedMatches);

    const sortedGroup = [...group].sort((a, b) => {
      const h2h =
        (headToHeadWins[b.team_id] ?? 0) - (headToHeadWins[a.team_id] ?? 0);
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

  const saved = await replaceDivisionStandings(
    divisionResult.data.tournament_id,
    divisionId,
    rows
  );
  if (saved.error) return { ok: false, error: saved.error };

  const dirtyResult = await setDivisionStandingsDirty(divisionId, false);
  if (!dirtyResult.ok) return dirtyResult;

  return { ok: true };
}

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
