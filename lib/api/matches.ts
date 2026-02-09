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
  team_a_id: string;
  team_b_id: string;
  court_id: string | null;
  status: string;
  divisions: { name: string } | null;
  groups: { name: string; order: number } | null;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  court: { id: string; name: string } | null;
};

export async function getMatchesByTournament(
  tournamentId: string
): Promise<ApiResult<MatchRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,tournament_id,division_id,group_id,team_a_id,team_b_id,court_id,status,divisions(name),groups(name,order),team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name),court:courts(id,name)"
    )
    .eq("tournament_id", tournamentId);

  return {
    data: data as MatchRow[] | null,
    error: error ? error.message : null,
  };
}

export async function getMatchById(
  matchId: string
): Promise<ApiResult<Pick<MatchRow, "id" | "tournament_id" | "court_id">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id,tournament_id,court_id")
    .eq("id", matchId)
    .maybeSingle();

  return {
    data: data as Pick<MatchRow, "id" | "tournament_id" | "court_id"> | null,
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
