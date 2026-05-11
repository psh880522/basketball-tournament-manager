import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";
import type {
  TeamJoinApplication,
  UserTeamStatus,
} from "@/lib/types/team-application";

/** 팀 찾기 목록 항목 */
export type TeamForJoinRow = {
  id: string;
  team_name: string;
  region: string | null;
  bio: string | null;
  contact: string;
  member_count: number;
};

/** 캡틴용 합류 신청 목록 항목 */
export type TeamApplicationRow = TeamJoinApplication & {
  applicant_display_name: string | null;
  applicant_verified_name: string | null;
  applicant_position: string | null;
  applicant_career_level: string | null;
};

/* ── getUserTeamStatus ────────────────────────────────────────────────── */

/**
 * 사용자의 현재 팀 상태를 런타임에 계산한다.
 * DB 쿼리 2회 (team_members, team_join_applications).
 */
export async function getUserTeamStatus(
  userId: string
): Promise<ApiResult<UserTeamStatus>> {
  const supabase = await createSupabaseServerClient();

  // 1. team_members 조회
  const { data: memberRows, error: memberError } = await supabase
    .from("team_members")
    .select("role_in_team")
    .eq("user_id", userId)
    .limit(1);

  if (memberError) return { data: null, error: memberError.message };

  if (memberRows && memberRows.length > 0) {
    const role = memberRows[0].role_in_team as string;
    if (role === "captain") return { data: "captain", error: null };
    return { data: "team_member", error: null };
  }

  // 2. 신청 중인 항목 확인
  const { data: appRows, error: appError } = await supabase
    .from("team_join_applications")
    .select("id")
    .eq("applicant_id", userId)
    .eq("status", "pending")
    .limit(1);

  if (appError) return { data: null, error: appError.message };

  if (appRows && appRows.length > 0) {
    return { data: "join_pending", error: null };
  }

  return { data: "no_team", error: null };
}

/* ── getTeamsForJoin ─────────────────────────────────────────────────── */

/**
 * 자신이 멤버가 아닌 팀 목록 반환 (SECURITY DEFINER RPC 사용).
 */
export async function getTeamsForJoin(
  userId: string
): Promise<ApiResult<TeamForJoinRow[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_teams_for_join", {
    p_user_id: userId,
  });

  if (error) return { data: null, error: error.message };

  const rows: TeamForJoinRow[] = (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      team_name: row.team_name as string,
      region: (row.region as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      contact: (row.contact as string) ?? "",
      member_count: Number(row.member_count ?? 0),
    })
  );

  return { data: rows, error: null };
}

/* ── applyForTeam ────────────────────────────────────────────────────── */

/**
 * 팀 합류 신청 (RPC apply_for_team 호출).
 */
export async function applyForTeam(
  teamId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("apply_for_team", {
    p_team_id: teamId,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "신청에 실패했습니다." };

  return { ok: true };
}

/* ── getTeamApplicationsForCaptain ──────────────────────────────────── */

/**
 * 캡틴용: 특정 팀의 pending 합류 신청 목록 조회.
 * applicant의 display_name, position, career_level을 join 해서 반환.
 */
export async function getTeamApplicationsForCaptain(
  teamId: string
): Promise<ApiResult<TeamApplicationRow[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_team_pending_applications", {
    p_team_id: teamId,
  });

  if (error) return { data: null, error: error.message };

  const rows: TeamApplicationRow[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    team_id: row.team_id as string,
    applicant_id: row.applicant_id as string,
    status: row.status as TeamJoinApplication["status"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    applicant_display_name: (row.display_name as string | null) ?? null,
    applicant_verified_name: (row.verified_name as string | null) ?? null,
    applicant_position: (row.player_position as string | null) ?? null,
    applicant_career_level: (row.career_level as string | null) ?? null,
  }));

  return { data: rows, error: null };
}

/* ── approveTeamApplication ─────────────────────────────────────────── */

/**
 * 캡틴이 합류 신청을 승인 (RPC approve_team_application 호출).
 */
export async function approveTeamApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("approve_team_application", {
    p_application_id: applicationId,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "승인에 실패했습니다." };

  return { ok: true };
}

/* ── rejectTeamApplication ──────────────────────────────────────────── */

/**
 * 캡틴이 합류 신청을 거절 (RPC reject_team_application 호출).
 */
export async function rejectTeamApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("reject_team_application", {
    p_application_id: applicationId,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "거절에 실패했습니다." };

  return { ok: true };
}
