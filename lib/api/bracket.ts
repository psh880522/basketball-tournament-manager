import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { listApprovedTeamsByDivision } from "@/lib/api/applications";

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
};

export type TeamRow = {
  id: string;
  team_name: string;
  division_id: string | null;
};

type TournamentStatus = "draft" | "open" | "closed";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

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
  groups: { name: string; order: number }[]
): Promise<ApiResult<GroupRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("groups")
    .insert(
      groups.map((group) => ({
        division_id: divisionId,
        name: group.name,
        order: group.order,
      }))
    )
    .select("id,division_id,name,order");

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
    round?: string | null;
    team_a_id: string;
    team_b_id: string;
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
