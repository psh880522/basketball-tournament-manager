import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type TeamStatus = "pending" | "approved" | "rejected";

export type TournamentStatus = "draft" | "open" | "closed" | "finished";

export type TeamApplication = {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_user_id: string;
  contact: string;
  status: TeamStatus;
  created_at: string;
};

export type TournamentSummary = {
  id: string;
  name: string;
  status: TournamentStatus;
};

export type PendingTeamRow = {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_user_id: string;
  contact: string;
  status: TeamStatus;
};

export type TeamWithTournament = {
  id: string;
  team_name: string;
  contact: string;
  status: TeamStatus;
  tournaments: TournamentSummary | null;
};

export type CaptainTeam = {
  id: string;
  team_name: string;
  status: TeamStatus;
};

export type TeamApplicationSummary = {
  id: string;
  team_name: string;
  status: TeamStatus;
};

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export async function getExistingTeamApplication(
  tournamentId: string,
  captainUserId: string
): Promise<ApiResult<Pick<TeamApplication, "id" | "status">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TeamApplication>("teams")
    .select("id,status")
    .eq("tournament_id", tournamentId)
    .eq("captain_user_id", captainUserId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function createTeamApplication(
  input: Omit<TeamApplication, "id" | "created_at"> & { status: TeamStatus }
): Promise<ApiResult<Pick<TeamApplication, "id">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TeamApplication>("teams")
    .insert({
      tournament_id: input.tournament_id,
      team_name: input.team_name,
      captain_user_id: input.captain_user_id,
      contact: input.contact,
      status: input.status,
    })
    .select("id")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getTournamentSummary(
  tournamentId: string
): Promise<ApiResult<TournamentSummary>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TournamentSummary>("tournaments")
    .select("id,name,status")
    .eq("id", tournamentId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getPendingTeams(
  tournamentId: string
): Promise<ApiResult<PendingTeamRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<PendingTeamRow>("teams")
    .select("id,tournament_id,team_name,captain_user_id,contact,status")
    .eq("tournament_id", tournamentId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getTeamApplicationById(
  teamId: string
): Promise<ApiResult<Pick<PendingTeamRow, "id" | "tournament_id" | "status">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<PendingTeamRow>("teams")
    .select("id,tournament_id,status")
    .eq("id", teamId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getTeamApplicationByTournamentAndCaptain(
  tournamentId: string,
  captainUserId: string
): Promise<ApiResult<TeamApplicationSummary>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TeamApplicationSummary>("teams")
    .select("id,team_name,status")
    .eq("tournament_id", tournamentId)
    .eq("captain_user_id", captainUserId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function updateTeamStatus(
  teamId: string,
  status: TeamStatus
): Promise<ApiResult<Pick<PendingTeamRow, "id" | "status">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<PendingTeamRow>("teams")
    .update({ status })
    .eq("id", teamId)
    .select("id,status")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}

export const getMyTeamsWithTournament = async (
  captainUserId: string
): Promise<ApiResult<TeamWithTournament[]>> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TeamWithTournament>("teams")
    .select("id,team_name,contact,status,tournaments(id,name,status)")
    .eq("captain_user_id", captainUserId)
    .order("created_at", { ascending: false });

  return {
    data,
    error: error ? error.message : null,
  };
};

export async function getCaptainTeams(
  captainUserId: string
): Promise<ApiResult<CaptainTeam[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<CaptainTeam>("teams")
    .select("id,team_name,status")
    .eq("captain_user_id", captainUserId)
    .order("created_at", { ascending: false });

  return {
    data,
    error: error ? error.message : null,
  };
}
