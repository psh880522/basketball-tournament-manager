import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";

// ────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────

export type AttendanceRow = {
  team_id: string;
  team_name: string;
  division_id: string;
  division_name: string;
  division_sort_order: number;
  group_id: string | null;
  group_name: string | null;
  group_order: number | null;
  captain_name: string | null;
  contact: string;
  attended: boolean;
};

// ────────────────────────────────────────────────────────────
// 조회
// ────────────────────────────────────────────────────────────

/**
 * 확정 팀 목록 + 출석 상태 조회
 * 4단계 개별 쿼리 후 메모리 병합
 */
export async function getTeamsWithAttendance(
  tournamentId: string
): Promise<ApiResult<AttendanceRow[]>> {
  const supabase = await createSupabaseServerClient();

  // 1. confirmed 팀 목록 (applications + teams + divisions)
  const { data: appRows, error: appError } = await supabase
    .from("tournament_team_applications")
    .select(
      "team_id, division_id, teams(team_name, captain_user_id, contact), divisions(name, sort_order)"
    )
    .eq("tournament_id", tournamentId)
    .eq("status", "confirmed");

  if (appError) return { data: null, error: appError.message };
  if (!appRows || appRows.length === 0) return { data: [], error: null };

  const teamIds = appRows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return row.team_id as string;
  });

  const captainUserIds = appRows
    .map((r) => {
      const row = r as unknown as Record<string, unknown>;
      const teams = row.teams as { captain_user_id: string | null } | null;
      return teams?.captain_user_id ?? null;
    })
    .filter((id): id is string => id !== null);

  // 2. league 그룹 정보 (group_teams + groups, type='league')
  const { data: groupRows, error: groupError } = await supabase
    .from("group_teams")
    .select("team_id, groups!inner(id, name, order, type)")
    .in("team_id", teamIds)
    .eq("groups.type", "league");

  if (groupError) return { data: null, error: groupError.message };

  const groupByTeam = new Map<
    string,
    { group_id: string; group_name: string; group_order: number }
  >();
  for (const gr of groupRows ?? []) {
    const row = gr as unknown as Record<string, unknown>;
    const teamId = row.team_id as string;
    const groups = row.groups as {
      id: string;
      name: string;
      order: number;
    } | null;
    if (groups) {
      groupByTeam.set(teamId, {
        group_id: groups.id,
        group_name: groups.name,
        group_order: groups.order,
      });
    }
  }

  // 3. 주장 이름 (profiles.display_name)
  const profileByUser = new Map<string, string | null>();
  if (captainUserIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", captainUserIds);

    if (profileError) return { data: null, error: profileError.message };

    for (const p of profileRows ?? []) {
      const row = p as unknown as Record<string, unknown>;
      profileByUser.set(
        row.id as string,
        (row.display_name as string | null) ?? null
      );
    }
  }

  // 4. 출석 상태
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("team_attendance")
    .select("team_id, attended")
    .eq("tournament_id", tournamentId)
    .in("team_id", teamIds);

  if (attendanceError) return { data: null, error: attendanceError.message };

  const attendedByTeam = new Map<string, boolean>();
  for (const a of attendanceRows ?? []) {
    const row = a as unknown as Record<string, unknown>;
    attendedByTeam.set(row.team_id as string, row.attended as boolean);
  }

  // 5. 병합 및 정렬
  const result: AttendanceRow[] = appRows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    const teamId = row.team_id as string;
    const teams = row.teams as {
      team_name: string;
      captain_user_id: string | null;
      contact: string;
    } | null;
    const divisions = row.divisions as {
      name: string;
      sort_order: number;
    } | null;
    const groupInfo = groupByTeam.get(teamId) ?? null;
    const captainId = teams?.captain_user_id ?? null;
    const captainName = captainId ? (profileByUser.get(captainId) ?? null) : null;

    return {
      team_id: teamId,
      team_name: teams?.team_name ?? "",
      division_id: row.division_id as string,
      division_name: divisions?.name ?? "",
      division_sort_order: divisions?.sort_order ?? 0,
      group_id: groupInfo?.group_id ?? null,
      group_name: groupInfo?.group_name ?? null,
      group_order: groupInfo?.group_order ?? null,
      captain_name: captainName,
      contact: teams?.contact ?? "",
      attended: attendedByTeam.get(teamId) ?? false,
    };
  });

  result.sort((a, b) => {
    if (a.division_sort_order !== b.division_sort_order)
      return a.division_sort_order - b.division_sort_order;
    const aOrder = a.group_order ?? 9999;
    const bOrder = b.group_order ?? 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.team_name.localeCompare(b.team_name, "ko");
  });

  return { data: result, error: null };
}

// ────────────────────────────────────────────────────────────
// 쓰기
// ────────────────────────────────────────────────────────────

/**
 * 팀 출석 상태 upsert
 */
export async function toggleTeamAttendance(
  tournamentId: string,
  teamId: string,
  attended: boolean
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "인증이 필요합니다." };
  }

  const { error } = await supabase.from("team_attendance").upsert(
    {
      tournament_id: tournamentId,
      team_id: teamId,
      attended,
      checked_by: user.id,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "tournament_id,team_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
