import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";
import type { ApiResult } from "@/lib/types/api";

export type TeamStatus = "pending" | "approved" | "rejected";

export type TournamentStatus = "draft" | "open" | "closed" | "finished";

/* ?占?占?My Teams (team_members 湲곕컲) ?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?*/

export type MyTeamRow = {
  team_id: string;
  team_name: string;
  role_in_team: string;
};

export async function listMyTeams(): Promise<{
  data: MyTeamRow[] | null;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "濡쒓렇?占쎌씠 ?占쎌슂?占쎈땲??" };

  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role_in_team, teams(team_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  const rows: MyTeamRow[] = (data ?? []).map((row: Record<string, unknown>) => {
    const teams = row.teams as { team_name: string } | null;
    return {
      team_id: row.team_id as string,
      team_name: teams?.team_name ?? "",
      role_in_team: row.role_in_team as string,
    };
  });

  return { data: rows, error: null };
}

/* ?占?占?My Managed Teams (manager占? ?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?*/

export type ManagedTeamRow = {
  team_id: string;
  team_name: string;
};

export async function listMyManagedTeams(): Promise<{
  data: ManagedTeamRow[] | null;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "濡쒓렇?占쎌씠 ?占쎌슂?占쎈땲??" };

  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, teams(team_name)")
    .eq("user_id", user.id)
    .eq("role_in_team", "captain")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  const rows: ManagedTeamRow[] = (data ?? []).map(
    (row: Record<string, unknown>) => {
      const teams = row.teams as { team_name: string } | null;
      return {
        team_id: row.team_id as string,
        team_name: teams?.team_name ?? "",
      };
    }
  );

  return { data: rows, error: null };
}

/* ?占?占?Create Team + manager 硫ㅻ쾭???占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?*/

export async function createTeam(input: {
  name: string;
  contact?: string;
}): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "濡쒓렇?占쎌씠 ?占쎌슂?占쎈땲??" };

  const { data, error } = await supabase.rpc("create_team_with_manager", {
    p_team_name: input.name,
    p_contact: input.contact ?? "",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, teamId: data as string };
}

export async function createDummyTeam(input: {
  tournamentId: string;
  divisionId: string;
  name?: string;
}): Promise<
  { ok: true; teamId: string; teamName: string } | { ok: false; error: string }
> {
  const auth = await getUserWithRole();
  if (auth.status !== "ready" || auth.role !== "organizer" || !auth.user) {
    return { ok: false, error: "권한이 없습니다." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: division, error: divisionError } = await supabase
    .from("divisions")
    .select("id")
    .eq("id", input.divisionId)
    .eq("tournament_id", input.tournamentId)
    .maybeSingle();

  if (divisionError) return { ok: false, error: divisionError.message };
  if (!division) return { ok: false, error: "유효하지 않은 division입니다." };

  let teamName = input.name?.trim() ?? "";

  if (!teamName) {
    const { count, error: countError } = await supabase
      .from("tournament_team_applications")
      .select("id, teams!inner(is_dummy)", { count: "exact", head: true })
      .eq("tournament_id", input.tournamentId)
      .eq("teams.is_dummy", true);

    if (countError) return { ok: false, error: countError.message };

    const nextIndex = (count ?? 0) + 1;
    teamName = `DUMMY-${nextIndex}`;
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      team_name: teamName,
      contact: "",
      created_by: auth.user.id,
      is_dummy: true,
    })
    .select("id, team_name")
    .single();

  if (teamError) return { ok: false, error: teamError.message };

  const { error: applicationError } = await supabase
    .from("tournament_team_applications")
    .insert({
      tournament_id: input.tournamentId,
      division_id: input.divisionId,
      team_id: team.id,
      applied_by: auth.user.id,
      status: "approved",
    });

  if (applicationError) return { ok: false, error: applicationError.message };

  return { ok: true, teamId: team.id, teamName: team.team_name };
}

/* ?占?占?Team Detail (team_members 湲곕컲) ?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?占?*/

export type TeamDetail = {
  id: string;
  team_name: string;
  contact: string;
  created_by: string;
};

export async function getTeam(
  teamId: string
): Promise<{ data: TeamDetail | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_name, contact, created_by")
    .eq("id", teamId)
    .maybeSingle();

  return { data, error: error ? error.message : null };
}

export async function getMyRoleInTeam(
  teamId: string
): Promise<{ role: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { role: null, error: "濡쒓렇?占쎌씠 ?占쎌슂?占쎈땲??" };

  const { data, error } = await supabase
    .from("team_members")
    .select("role_in_team")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { role: null, error: error.message };
  return { role: data?.role_in_team ?? null, error: null };
}

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

export async function getExistingTeamApplication(
  tournamentId: string,
  captainUserId: string
): Promise<ApiResult<Pick<TeamApplication, "id" | "status">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("teams")
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
    .from("teams")
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
    .from("tournaments")
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
    .from("teams")
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
    .from("teams")
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
    .from("teams")
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
    .from("teams")
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
    .from("teams")
    .select("id,team_name,contact,status,tournaments(id,name,status)")
    .eq("captain_user_id", captainUserId)
    .order("created_at", { ascending: false });

  return {
    data: data as TeamWithTournament[] | null,
    error: error ? error.message : null,
  };
};

export async function getCaptainTeams(
  captainUserId: string
): Promise<ApiResult<CaptainTeam[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id,team_name,status")
    .eq("captain_user_id", captainUserId)
    .order("created_at", { ascending: false });

  return {
    data,
    error: error ? error.message : null,
  };
}
