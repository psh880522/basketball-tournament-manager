import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { setDivisionStandingsDirty } from "@/lib/api/divisions";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type MatchRow = {
  id: string;
  tournament_id: string;
  division_id: string;
  group_id: string | null;
  round: string | null;
  team_a_id: string;
  team_b_id: string;
  court_id: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  divisions: { name: string } | null;
  groups: { name: string; order: number } | null;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  court: { id: string; name: string } | null;
};

export type GroupMatchResultRow = Pick<
  MatchRow,
  | "id"
  | "group_id"
  | "team_a_id"
  | "team_b_id"
  | "status"
  | "score_a"
  | "score_b"
  | "winner_team_id"
>;

export async function getMatchesByTournament(
  tournamentId: string
): Promise<ApiResult<MatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,tournament_id,division_id,group_id,round,team_a_id,team_b_id,court_id,status,score_a,score_b,winner_team_id,divisions(name),groups(name,order),team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name),court:courts(id,name)"
    )
    .eq("tournament_id", tournamentId);

  return {
    data: data as MatchRow[] | null,
    error: error ? error.message : null,
  };
}

export async function getMatchById(
  matchId: string
): Promise<
  ApiResult<
    Pick<
      MatchRow,
      | "id"
      | "tournament_id"
      | "court_id"
      | "round"
      | "team_a_id"
      | "team_b_id"
      | "status"
      | "score_a"
      | "score_b"
      | "winner_team_id"
    >
  >
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,tournament_id,court_id,round,team_a_id,team_b_id,status,score_a,score_b,winner_team_id"
    )
    .eq("id", matchId)
    .maybeSingle();

  return {
    data: data as
      | Pick<
          MatchRow,
          | "id"
          | "tournament_id"
          | "court_id"
          | "round"
          | "team_a_id"
          | "team_b_id"
          | "status"
          | "score_a"
          | "score_b"
          | "winner_team_id"
        >
      | null,
    error: error ? error.message : null,
  };
}

export async function updateMatchCourt(
  matchId: string,
  courtId: string | null
): Promise<ApiResult<Pick<MatchRow, "id">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ court_id: courtId })
    .eq("id", matchId)
    .select("id")
    .single();

  return {
    data: data as Pick<MatchRow, "id"> | null,
    error: error ? error.message : null,
  };
}

export async function getCompletedMatchesByGroup(
  groupId: string
): Promise<ApiResult<GroupMatchResultRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,group_id,team_a_id,team_b_id,status,score_a,score_b,winner_team_id"
    )
    .eq("group_id", groupId)
    .eq("status", "completed");

  return {
    data: data as GroupMatchResultRow[] | null,
    error: error ? error.message : null,
  };
}

type MatchResultUpdate = {
  score_a: number;
  score_b: number;
  winner_team_id: string;
  status: "completed";
};

type TournamentMatchRow = {
  id: string;
  division_id: string;
  round: string | null;
  status: string;
  winner_team_id: string | null;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  created_at: string;
};

export type TournamentBracketMatchRow = {
  id: string;
  division_id: string;
  round: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  created_at: string;
};

export async function updateMatchResult(
  matchId: string,
  update: MatchResultUpdate
): Promise<ApiResult<Pick<MatchRow, "id">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", matchId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  return {
    data: data as Pick<MatchRow, "id"> | null,
    error: error ? error.message : null,
  };
}

export async function getTournamentMatchesByDivision(
  divisionId: string
): Promise<ApiResult<TournamentMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,division_id,round,status,winner_team_id,created_at,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name)"
    )
    .eq("division_id", divisionId)
    .is("group_id", null)
    .order("created_at", { ascending: true });

  return {
    data: data as TournamentMatchRow[] | null,
    error: error ? error.message : null,
  };
}

export async function getTournamentMatchesByRound(
  divisionId: string,
  round: string
): Promise<ApiResult<TournamentMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,division_id,round,status,winner_team_id,created_at,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name)"
    )
    .eq("division_id", divisionId)
    .eq("round", round)
    .is("group_id", null)
    .order("created_at", { ascending: true });

  return {
    data: data as TournamentMatchRow[] | null,
    error: error ? error.message : null,
  };
}

export async function getTournamentBracketMatches(
  tournamentId: string
): Promise<ApiResult<TournamentBracketMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,division_id,round,status,score_a,score_b,winner_team_id,created_at,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name)"
    )
    .eq("tournament_id", tournamentId)
    .is("group_id", null)
    .order("created_at", { ascending: true });

  return {
    data: data as TournamentBracketMatchRow[] | null,
    error: error ? error.message : null,
  };
}

/* ── division 기준 삭제 (bracket overwrite 용) ── */

export async function deleteMatchesByDivision(
  divisionId: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("division_id", divisionId);

  return { error: error ? error.message : null };
}

/* ── Result Entry 용 ── */

export type MatchResultRow = MatchListRow & {
  team_a_id: string;
  team_b_id: string;
};

export async function listMatchesForResultEntry(
  tournamentId: string,
  filters?: {
    divisionId?: string;
    status?: "pending" | "completed";
    courtId?: string;
  }
): Promise<ApiResult<MatchResultRow[]>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("matches")
    .select(
      "id,tournament_id,division_id,group_id,round,team_a_id,team_b_id,scheduled_at,court_id,status,score_a,score_b,created_at,divisions(name),groups(name),team_a:teams!matches_team_a_id_fkey(team_name),team_b:teams!matches_team_b_id_fkey(team_name),court:courts(name)"
    )
    .eq("tournament_id", tournamentId);

  if (filters?.divisionId) {
    query = query.eq("division_id", filters.divisionId);
  }

  if (filters?.status === "completed") {
    query = query.eq("status", "completed");
  } else if (filters?.status === "pending") {
    query = query.in("status", ["scheduled", "in_progress"]);
  }

  if (filters?.courtId) {
    query = query.eq("court_id", filters.courtId);
  }

  query = query
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };

  const rows: MatchResultRow[] = ((data ?? []) as Record<string, unknown>[]).map(
    (row) => {
      const div = row.divisions as { name: string } | null;
      const grp = row.groups as { name: string } | null;
      const teamA = row.team_a as { team_name: string } | null;
      const teamB = row.team_b as { team_name: string } | null;
      const court = row.court as { name: string } | null;

      return {
        id: row.id as string,
        tournament_id: row.tournament_id as string,
        division_id: row.division_id as string,
        divisionName: div?.name ?? "",
        group_id: row.group_id as string | null,
        groupName: grp?.name ?? null,
        team_a_id: row.team_a_id as string,
        team_b_id: row.team_b_id as string,
        round: (row.round as string | null) ?? null,
        teamAName: teamA?.team_name ?? "TBD",
        teamBName: teamB?.team_name ?? "TBD",
        scheduled_at: row.scheduled_at as string | null,
        court_id: row.court_id as string | null,
        courtName: court?.name ?? null,
        status: row.status as string,
        score_a: row.score_a as number | null,
        score_b: row.score_b as number | null,
        created_at: row.created_at as string,
      };
    }
  );

  return { data: rows, error: null };
}

export type CompletedMatchRow = {
  id: string;
  division_id: string;
  team_a_id: string;
  team_b_id: string;
  winner_team_id: string | null;
  score_a: number;
  score_b: number;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
};

export async function listCompletedMatchesByDivision(
  divisionId: string
): Promise<ApiResult<CompletedMatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,division_id,team_a_id,team_b_id,winner_team_id,score_a,score_b,team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name)"
    )
    .eq("division_id", divisionId)
    .eq("status", "completed");

  return {
    data: data as CompletedMatchRow[] | null,
    error: error ? error.message : null,
  };
}

export async function saveMatchResult({
  matchId,
  scoreA,
  scoreB,
  status,
}: {
  matchId: string;
  scoreA: number;
  scoreB: number;
  status: "scheduled" | "completed";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (status === "completed" && scoreA === scoreB) {
    return {
      ok: false,
      error: "동점은 허용되지 않습니다. 점수를 다시 입력해주세요.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: match, error: fetchError } = await supabase
    .from("matches")
    .select("id,division_id,team_a_id,team_b_id")
    .eq("id", matchId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." };

  const m = match as {
    id: string;
    division_id: string;
    team_a_id: string;
    team_b_id: string;
  };

  const winnerId =
    status === "completed"
      ? scoreA > scoreB
        ? m.team_a_id
        : m.team_b_id
      : null;

  const { error } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      status,
      winner_team_id: winnerId,
    })
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };

  const dirtyResult = await setDivisionStandingsDirty(m.division_id, true);
  if (!dirtyResult.ok) return { ok: false, error: dirtyResult.error };

  return { ok: true };
}

export async function saveMatchScore({
  matchId,
  scoreA,
  scoreB,
}: {
  matchId: string;
  scoreA: number;
  scoreB: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return saveMatchResult({ matchId, scoreA, scoreB, status: "scheduled" });
}

export async function completeMatch({
  matchId,
  scoreA,
  scoreB,
}: {
  matchId: string;
  scoreA: number;
  scoreB: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return saveMatchResult({ matchId, scoreA, scoreB, status: "completed" });
}

/* ── 운영자용 경기 목록 (필터 지원) ── */

export type MatchListRow = {
  id: string;
  tournament_id: string;
  division_id: string;
  divisionName: string;
  group_id: string | null;
  groupName: string | null;
  round: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  teamAName: string;
  teamBName: string;
  scheduled_at: string | null;
  court_id: string | null;
  courtName: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  created_at: string;
};

export async function listTournamentMatches(
  tournamentId: string,
  filters?: {
    divisionId?: string;
    courtId?: string;
  }
): Promise<ApiResult<MatchListRow[]>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("matches")
    .select(
      "id,tournament_id,division_id,group_id,round,team_a_id,team_b_id,scheduled_at,court_id,status,score_a,score_b,created_at,divisions(name),groups(name),team_a:teams!matches_team_a_id_fkey(team_name),team_b:teams!matches_team_b_id_fkey(team_name),court:courts(name)"
    )
    .eq("tournament_id", tournamentId);

  if (filters?.divisionId) {
    query = query.eq("division_id", filters.divisionId);
  }
  if (filters?.courtId) {
    query = query.eq("court_id", filters.courtId);
  }

  // scheduled_at asc (null last), then created_at asc
  query = query
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };

  const rows: MatchListRow[] = ((data ?? []) as Record<string, unknown>[]).map(
    (row) => {
      const div = row.divisions as { name: string } | null;
      const grp = row.groups as { name: string } | null;
      const teamA = row.team_a as { team_name: string } | null;
      const teamB = row.team_b as { team_name: string } | null;
      const court = row.court as { name: string } | null;

      return {
        id: row.id as string,
        tournament_id: row.tournament_id as string,
        division_id: row.division_id as string,
        divisionName: div?.name ?? "",
        group_id: row.group_id as string | null,
        groupName: grp?.name ?? null,
        team_a_id: (row.team_a_id as string | null) ?? null,
        team_b_id: (row.team_b_id as string | null) ?? null,
        round: (row.round as string | null) ?? null,
        teamAName: teamA?.team_name ?? "TBD",
        teamBName: teamB?.team_name ?? "TBD",
        scheduled_at: row.scheduled_at as string | null,
        court_id: row.court_id as string | null,
        courtName: court?.name ?? null,
        status: row.status as string,
        score_a: row.score_a as number | null,
        score_b: row.score_b as number | null,
        created_at: row.created_at as string,
      };
    }
  );

  return { data: rows, error: null };
}
