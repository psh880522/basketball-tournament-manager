import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";
import type { Roster, RosterWithMembers, RosterMember } from "@/lib/types/roster";

/* ── TeamMemberForRoster ────────────────────────────────────────────────── */

/** 로스터 추가 UI에서 선수 선택용 팀 멤버 항목 */
export type TeamMemberForRoster = {
  user_id: string;
  role_in_team: "captain" | "player";
  display_name: string | null;
  verified_name: string | null;
  player_position: string | null;
  career_level: string | null;
};

/* ── TeamMember (팀 상세 페이지용) ──────────────────────────────────────── */

/** 팀 멤버 목록 (모든 팀원 조회 가능) */
export type TeamMember = {
  user_id: string;
  role_in_team: "captain" | "player";
  display_name: string | null;
  verified_name: string | null;
  player_position: string | null;
  career_level: string | null;
  joined_at: string;
};

/**
 * 팀 전체 멤버 조회 (captain + player 모두 호출 가능).
 * RPC get_team_members 사용 (profiles RLS 우회 필요).
 */
export async function getTeamMembers(
  teamId: string
): Promise<ApiResult<TeamMember[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_team_members", {
    p_team_id: teamId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    members?: Record<string, unknown>[];
  };

  if (!result.ok) return { data: null, error: result.error ?? "팀 멤버 조회에 실패했습니다." };

  const members: TeamMember[] = (result.members ?? []).map((m) => ({
    user_id: m.user_id as string,
    role_in_team: m.role_in_team as "captain" | "player",
    display_name: (m.display_name as string | null) ?? null,
    verified_name: (m.verified_name as string | null) ?? null,
    player_position: (m.player_position as string | null) ?? null,
    career_level: (m.career_level as string | null) ?? null,
    joined_at: m.joined_at as string,
  }));

  return { data: members, error: null };
}

/* ── getOrCreateRoster ─────────────────────────────────────────────────── */

/**
 * application_id에 대한 로스터가 없으면 생성, 있으면 기존 반환.
 * RPC upsert_roster 호출.
 */
export async function getOrCreateRoster(
  applicationId: string
): Promise<ApiResult<Roster>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("upsert_roster", {
    p_application_id: applicationId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as { ok: boolean; error?: string; roster_id?: string };
  if (!result.ok) return { data: null, error: result.error ?? "로스터 생성에 실패했습니다." };

  // roster_id를 통해 전체 roster 행 반환
  const { data: roster, error: fetchError } = await supabase
    .from("rosters")
    .select("id, application_id, team_id, tournament_id, created_at, updated_at")
    .eq("id", result.roster_id!)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError.message };
  if (!roster) return { data: null, error: "로스터를 찾을 수 없습니다." };

  return { data: roster as Roster, error: null };
}

/* ── getRosterByApplication ─────────────────────────────────────────────── */

/**
 * application_id로 기존 로스터 조회 (없으면 null 반환).
 */
export async function getRosterByApplication(
  applicationId: string
): Promise<ApiResult<Roster | null>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rosters")
    .select("id, application_id, team_id, tournament_id, created_at, updated_at")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as Roster | null), error: null };
}

/* ── getRosterWithMembers ──────────────────────────────────────────────── */

/**
 * 로스터 + 멤버 프로필 조회.
 * RPC get_roster_with_members 사용 (profiles RLS 우회 필요).
 */
export async function getRosterWithMembers(
  rosterId: string
): Promise<ApiResult<RosterWithMembers>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_roster_with_members", {
    p_roster_id: rosterId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    roster?: Record<string, unknown>;
    members?: Record<string, unknown>[];
  };

  if (!result.ok) return { data: null, error: result.error ?? "로스터 조회에 실패했습니다." };

  const r = result.roster!;
  const members: RosterWithMembers["roster_members"] = (result.members ?? []).map((m) => ({
    id: m.id as string,
    roster_id: m.roster_id as string,
    user_id: m.user_id as string,
    created_at: m.created_at as string,
    display_name: (m.display_name as string | null) ?? null,
    verified_name: (m.verified_name as string | null) ?? null,
    player_position: (m.player_position as string | null) ?? null,
  }));

  return {
    data: {
      id: r.id as string,
      application_id: r.application_id as string,
      team_id: r.team_id as string,
      tournament_id: r.tournament_id as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      roster_members: members,
    },
    error: null,
  };
}

/* ── getTeamMembersForRoster ────────────────────────────────────────────── */

/**
 * 팀 전체 멤버 + 프로필 반환 (로스터 추가 UI에서 선수 선택용).
 * RPC get_team_members_for_roster 사용 (profiles RLS 우회 필요).
 */
export async function getTeamMembersForRoster(
  teamId: string
): Promise<ApiResult<TeamMemberForRoster[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_team_members_for_roster", {
    p_team_id: teamId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    members?: Record<string, unknown>[];
  };

  if (!result.ok) return { data: null, error: result.error ?? "팀 멤버 조회에 실패했습니다." };

  const members: TeamMemberForRoster[] = (result.members ?? []).map((m) => ({
    user_id: m.user_id as string,
    role_in_team: m.role_in_team as "captain" | "player",
    display_name: (m.display_name as string | null) ?? null,
    verified_name: (m.verified_name as string | null) ?? null,
    player_position: (m.player_position as string | null) ?? null,
    career_level: (m.career_level as string | null) ?? null,
  }));

  return { data: members, error: null };
}

/* ── addRosterMember ────────────────────────────────────────────────────── */

/**
 * 로스터에 선수 추가 (RPC add_roster_member 호출).
 * 중복 출전 에러 포함.
 */
export async function addRosterMember(
  rosterId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("add_roster_member", {
    p_roster_id: rosterId,
    p_user_id: userId,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "선수 추가에 실패했습니다." };

  return { ok: true };
}

/* ── removeRosterMember ─────────────────────────────────────────────────── */

/**
 * 로스터에서 선수 제거 (RPC remove_roster_member 호출).
 */
export async function removeRosterMember(
  rosterId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("remove_roster_member", {
    p_roster_id: rosterId,
    p_user_id: userId,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "선수 제거에 실패했습니다." };

  return { ok: true };
}
