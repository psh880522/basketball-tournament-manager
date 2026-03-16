import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type MyApplicationRow = {
  id: string;
  team_id: string;
  team_name: string;
  division_id: string;
  division_name: string;
  status: ApplicationStatus;
};

export type TournamentApplicationRow = {
  id: string;
  team_id: string;
  team_name: string;
  team_is_dummy: boolean;
  division_id: string;
  division_name: string;
  status: ApplicationStatus;
  applied_by: string;
  created_at: string;
};

export type ApprovedTeamRow = {
  team_id: string;
  team_name: string;
};

/**
 * 현재 유저가 manager인 팀 중 해당 tournament에 신청한 application 조회
 */
export async function getMyApplicationStatus(
  tournamentId: string
): Promise<{ data: MyApplicationRow | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "로그인이 필요합니다." };

  // manager인 팀의 team_id 목록
  const { data: memberships, error: memErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("role_in_team", "manager");

  if (memErr) return { data: null, error: memErr.message };

  const teamIds = (memberships ?? []).map(
    (m: { team_id: string }) => m.team_id
  );
  if (teamIds.length === 0) return { data: null, error: null };

  const { data, error } = await supabase
    .from("tournament_team_applications")
    .select("id, team_id, status, division_id, teams(team_name), divisions(name)")
    .eq("tournament_id", tournamentId)
    .in("team_id", teamIds)
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const row = data as Record<string, unknown>;
  const teams = row.teams as { team_name: string } | null;
  const divisions = row.divisions as { name: string } | null;

  return {
    data: {
      id: data.id,
      team_id: data.team_id,
      team_name: teams?.team_name ?? "",
      division_id: (row.division_id as string) ?? "",
      division_name: divisions?.name ?? "",
      status: data.status as ApplicationStatus,
    },
    error: null,
  };
}

/**
 * 대회 참가 신청
 */
export async function applyToTournament(input: {
  tournamentId: string;
  teamId: string;
  divisionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // manager 확인
  const { data: membership } = await supabase
    .from("team_members")
    .select("role_in_team")
    .eq("team_id", input.teamId)
    .eq("user_id", user.id)
    .eq("role_in_team", "manager")
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "이 팀의 매니저만 신청할 수 있습니다." };
  }

  // tournament status=open 확인
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", input.tournamentId)
    .maybeSingle();

  if (!tournament || tournament.status !== "open") {
    return { ok: false, error: "현재 신청 가능한 대회가 아닙니다." };
  }

  // division이 해당 tournament에 속하는지 검증
  const { data: division } = await supabase
    .from("divisions")
    .select("id")
    .eq("id", input.divisionId)
    .eq("tournament_id", input.tournamentId)
    .maybeSingle();

  if (!division) {
    return { ok: false, error: "유효하지 않은 division입니다." };
  }

  // INSERT
  const { error } = await supabase
    .from("tournament_team_applications")
    .insert({
      tournament_id: input.tournamentId,
      team_id: input.teamId,
      division_id: input.divisionId,
      applied_by: user.id,
      status: "pending",
    });

  if (error) {
    // unique constraint → 중복 신청
    if (error.code === "23505") {
      return { ok: false, error: "이미 이 대회에 신청한 팀입니다." };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * 대회의 전체 참가 신청 목록 조회 (organizer용)
 * pending 먼저, 그 다음 approved/rejected, pending 내 created_at asc
 */
export async function listTournamentApplications(
  tournamentId: string,
  options?: { divisionId?: string }
): Promise<{ data: TournamentApplicationRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("tournament_team_applications")
    .select(
      "id, team_id, division_id, status, applied_by, created_at, teams(team_name,is_dummy), divisions(name)"
    )
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (options?.divisionId) {
    query = query.eq("division_id", options.divisionId);
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  const rows: TournamentApplicationRow[] = ((data ?? []) as Record<string, unknown>[]).map(
    (row) => {
      const teams = row.teams as { team_name: string; is_dummy: boolean } | null;
      const divisions = row.divisions as { name: string } | null;
      return {
        id: row.id as string,
        team_id: row.team_id as string,
        team_name: teams?.team_name ?? "",
        team_is_dummy: teams?.is_dummy ?? false,
        division_id: (row.division_id as string) ?? "",
        division_name: divisions?.name ?? "",
        status: row.status as ApplicationStatus,
        applied_by: row.applied_by as string,
        created_at: row.created_at as string,
      };
    }
  );

  // pending을 먼저, 나머지는 기존 순서 유지
  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  return { data: [...pending, ...rest], error: null };
}

/**
 * 참가 신청 상태 변경 (organizer만)
 */
export async function setApplicationStatus(
  applicationId: string,
  status: "approved" | "rejected"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("tournament_team_applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

/**
 * 대회의 승인된 팀 목록 조회 (downstream helper)
 */
export async function listApprovedTeamsForTournament(
  tournamentId: string
): Promise<{ data: ApprovedTeamRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tournament_team_applications")
    .select("team_id, teams(team_name)")
    .eq("tournament_id", tournamentId)
    .eq("status", "approved");

  if (error) return { data: [], error: error.message };

  const rows: ApprovedTeamRow[] = ((data ?? []) as Record<string, unknown>[]).map(
    (row) => {
      const teams = row.teams as { team_name: string } | null;
      return {
        team_id: row.team_id as string,
        team_name: teams?.team_name ?? "",
      };
    }
  );

  return { data: rows, error: null };
}

/**
 * division 기준 승인된 팀 목록 조회
 */
export async function listApprovedTeamsByDivision(
  tournamentId: string,
  divisionId: string
): Promise<{ data: ApprovedTeamRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tournament_team_applications")
    .select("team_id, teams(team_name)")
    .eq("tournament_id", tournamentId)
    .eq("division_id", divisionId)
    .eq("status", "approved");

  if (error) return { data: [], error: error.message };

  const rows: ApprovedTeamRow[] = ((data ?? []) as Record<string, unknown>[]).map(
    (row) => {
      const teams = row.teams as { team_name: string } | null;
      return {
        team_id: row.team_id as string,
        team_name: teams?.team_name ?? "",
      };
    }
  );

  return { data: rows, error: null };
}
