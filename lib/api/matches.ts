import { createSupabaseServerClient } from "@/src/lib/supabase/server";

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
