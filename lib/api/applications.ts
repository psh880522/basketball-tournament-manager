import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";

// ────────────────────────────────────────────────────────────
// 상태 타입
// ────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "payment_pending"
  | "paid_pending_approval"
  | "confirmed"
  | "waitlisted"
  | "expired"
  | "cancelled";

/** 정원 점유 대상 상태 */
export const OCCUPYING_STATUSES: ApplicationStatus[] = [
  "payment_pending",
  "paid_pending_approval",
  "confirmed",
];

/** 중복 신청 방지 대상 상태 (활성 상태) */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "payment_pending",
  "paid_pending_approval",
  "confirmed",
  "waitlisted",
];

// ────────────────────────────────────────────────────────────
// Row 타입
// ────────────────────────────────────────────────────────────

export type MyApplicationRow = {
  id: string;
  team_id: string;
  team_name: string;
  division_id: string;
  division_name: string;
  status: ApplicationStatus;
  base_entry_fee: number;
  discount_amount: number;
  final_amount: number;
  waitlist_position: number | null;
  payment_due_at: string | null;
  depositor_name: string | null;
  depositor_note: string | null;
  paid_marked_at: string | null;
  submitted_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
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
  base_entry_fee: number;
  discount_amount: number;
  final_amount: number;
  waitlist_position: number | null;
  payment_due_at: string | null;
  depositor_name: string | null;
  depositor_note: string | null;
  paid_marked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  admin_memo: string | null;
  submitted_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
};

export type ApprovedTeamRow = {
  team_id: string;
  team_name: string;
};

export type ApplicationStatusHistoryRow = {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by: string;
  changed_at: string;
  memo: string | null;
};

export type MarkPaymentInput = {
  applicationId: string;
  depositorName: string;
  depositorNote?: string;
};

// ────────────────────────────────────────────────────────────
// 조회 함수
// ────────────────────────────────────────────────────────────

const MY_APP_SELECT = [
  "id",
  "team_id",
  "status",
  "division_id",
  "base_entry_fee",
  "discount_amount",
  "final_amount",
  "waitlist_position",
  "payment_due_at",
  "depositor_name",
  "depositor_note",
  "paid_marked_at",
  "submitted_at",
  "confirmed_at",
  "cancelled_at",
  "expired_at",
  "teams(team_name)",
  "divisions(name)",
].join(", ");

/**
 * 현재 유저가 manager인 팀 중 해당 tournament에 신청한 application 조회
 * divisionId를 제공하면 해당 division 기준으로 조회
 */
export async function getMyApplicationStatus(
  tournamentId: string,
  divisionId?: string
): Promise<{ data: MyApplicationRow | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data: memberships, error: memErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("role_in_team", "captain");

  if (memErr) return { data: null, error: memErr.message };

  const teamIds = (memberships ?? []).map((m: { team_id: string }) => m.team_id);
  if (teamIds.length === 0) return { data: null, error: null };

  let query = supabase
    .from("tournament_team_applications")
    .select(MY_APP_SELECT)
    .eq("tournament_id", tournamentId)
    .in("team_id", teamIds);

  if (divisionId) {
    query = query.eq("division_id", divisionId);
  } else {
    query = query.in("status", ACTIVE_STATUSES);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const row = data as unknown as Record<string, unknown>;
  const teams = row.teams as { team_name: string } | null;
  const divisions = row.divisions as { name: string } | null;

  return {
    data: {
      id: row.id as string,
      team_id: row.team_id as string,
      team_name: teams?.team_name ?? "",
      division_id: row.division_id as string,
      division_name: divisions?.name ?? "",
      status: row.status as ApplicationStatus,
      base_entry_fee: (row.base_entry_fee as number) ?? 0,
      discount_amount: (row.discount_amount as number) ?? 0,
      final_amount: (row.final_amount as number) ?? 0,
      waitlist_position: (row.waitlist_position as number | null) ?? null,
      payment_due_at: (row.payment_due_at as string | null) ?? null,
      depositor_name: (row.depositor_name as string | null) ?? null,
      depositor_note: (row.depositor_note as string | null) ?? null,
      paid_marked_at: (row.paid_marked_at as string | null) ?? null,
      submitted_at: (row.submitted_at as string) ?? "",
      confirmed_at: (row.confirmed_at as string | null) ?? null,
      cancelled_at: (row.cancelled_at as string | null) ?? null,
      expired_at: (row.expired_at as string | null) ?? null,
    },
    error: null,
  };
}

/**
 * 대회 참가 신청 (submit_tournament_application RPC 경유)
 */
export async function applyToTournament(input: {
  tournamentId: string;
  teamId: string;
  divisionId: string;
}): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("submit_tournament_application", {
    p_tournament_id: input.tournamentId,
    p_team_id: input.teamId,
    p_division_id: input.divisionId,
    p_user_id: user.id,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string; status?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "신청에 실패했습니다." };

  return { ok: true, status: result.status ?? "payment_pending" };
}

const TOURNAMENT_APP_SELECT = [
  "id",
  "team_id",
  "division_id",
  "status",
  "applied_by",
  "created_at",
  "base_entry_fee",
  "discount_amount",
  "final_amount",
  "waitlist_position",
  "payment_due_at",
  "depositor_name",
  "depositor_note",
  "paid_marked_at",
  "approved_by",
  "approved_at",
  "admin_memo",
  "submitted_at",
  "confirmed_at",
  "cancelled_at",
  "expired_at",
  "teams(team_name,is_dummy)",
  "divisions(name)",
].join(", ");

/**
 * 대회의 전체 참가 신청 목록 조회 (organizer용)
 */
export async function listTournamentApplications(
  tournamentId: string,
  options?: { divisionId?: string; statusFilter?: ApplicationStatus[] }
): Promise<{ data: TournamentApplicationRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("tournament_team_applications")
    .select(TOURNAMENT_APP_SELECT)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (options?.divisionId) {
    query = query.eq("division_id", options.divisionId);
  }

  if (options?.statusFilter && options.statusFilter.length > 0) {
    query = query.in("status", options.statusFilter);
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  const rows: TournamentApplicationRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map(
    (row) => {
      const teams = row.teams as { team_name: string; is_dummy: boolean } | null;
      const divisions = row.divisions as { name: string } | null;
      return {
        id: row.id as string,
        team_id: row.team_id as string,
        team_name: teams?.team_name ?? "",
        team_is_dummy: teams?.is_dummy ?? false,
        division_id: row.division_id as string,
        division_name: divisions?.name ?? "",
        status: row.status as ApplicationStatus,
        applied_by: row.applied_by as string,
        created_at: row.created_at as string,
        base_entry_fee: (row.base_entry_fee as number) ?? 0,
        discount_amount: (row.discount_amount as number) ?? 0,
        final_amount: (row.final_amount as number) ?? 0,
        waitlist_position: (row.waitlist_position as number | null) ?? null,
        payment_due_at: (row.payment_due_at as string | null) ?? null,
        depositor_name: (row.depositor_name as string | null) ?? null,
        depositor_note: (row.depositor_note as string | null) ?? null,
        paid_marked_at: (row.paid_marked_at as string | null) ?? null,
        approved_by: (row.approved_by as string | null) ?? null,
        approved_at: (row.approved_at as string | null) ?? null,
        admin_memo: (row.admin_memo as string | null) ?? null,
        submitted_at: (row.submitted_at as string) ?? "",
        confirmed_at: (row.confirmed_at as string | null) ?? null,
        cancelled_at: (row.cancelled_at as string | null) ?? null,
        expired_at: (row.expired_at as string | null) ?? null,
      };
    }
  );

  // 정렬: payment_pending, paid_pending_approval 먼저 → waitlisted → confirmed → 나머지
  const ORDER: ApplicationStatus[] = [
    "payment_pending",
    "paid_pending_approval",
    "waitlisted",
    "confirmed",
    "expired",
    "cancelled",
  ];
  rows.sort((a, b) => {
    const ai = ORDER.indexOf(a.status);
    const bi = ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return a.created_at.localeCompare(b.created_at);
  });

  return { data: rows, error: null };
}

/**
 * 대회의 confirmed 팀 목록 조회 (downstream helper)
 */
export async function listApprovedTeamsForTournament(
  tournamentId: string
): Promise<{ data: ApprovedTeamRow[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tournament_team_applications")
    .select("team_id, teams(team_name)")
    .eq("tournament_id", tournamentId)
    .eq("status", "confirmed");

  if (error) return { data: [], error: error.message };

  const rows: ApprovedTeamRow[] = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const teams = row.teams as { team_name: string } | null;
    return {
      team_id: row.team_id as string,
      team_name: teams?.team_name ?? "",
    };
  });

  return { data: rows, error: null };
}

/**
 * division 기준 confirmed 팀 목록 조회
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
    .eq("status", "confirmed");

  if (error) return { data: [], error: error.message };

  const rows: ApprovedTeamRow[] = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const teams = row.teams as { team_name: string } | null;
    return {
      team_id: row.team_id as string,
      team_name: teams?.team_name ?? "",
    };
  });

  return { data: rows, error: null };
}

// ────────────────────────────────────────────────────────────
// 정원 헬퍼
// ────────────────────────────────────────────────────────────

/**
 * division의 현재 점유 수 (OCCUPYING_STATUSES 기준)
 */
export async function getOccupiedCount(divisionId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("tournament_team_applications")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId)
    .in("status", OCCUPYING_STATUSES);

  if (error) return 0;
  return count ?? 0;
}

// ────────────────────────────────────────────────────────────
// 상태 전환 함수 (RPC 호출)
// ────────────────────────────────────────────────────────────

/**
 * 사용자: 입금 완료 표시
 */
export async function markPaymentDone(
  input: MarkPaymentInput
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("mark_payment_done", {
    p_application_id: input.applicationId,
    p_user_id: user.id,
    p_depositor_name: input.depositorName,
    p_depositor_note: input.depositorNote ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "처리에 실패했습니다." };

  return { ok: true };
}

/**
 * 사용자(팀 매니저): 신청 취소
 */
export async function cancelApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("cancel_application", {
    p_application_id: applicationId,
    p_user_id: user.id,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "취소에 실패했습니다." };

  return { ok: true };
}

/**
 * 운영자: 입금 확인 완료 (confirmed 전환)
 */
export async function confirmApplication(
  applicationId: string,
  memo?: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("confirm_application", {
    p_application_id: applicationId,
    p_admin_user_id: user.id,
    p_memo: memo ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "처리에 실패했습니다." };

  return { ok: true };
}

/**
 * 운영자: 신청 취소
 */
export async function adminCancelApplication(
  applicationId: string,
  memo?: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("admin_cancel_application", {
    p_application_id: applicationId,
    p_admin_user_id: user.id,
    p_memo: memo ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error ?? "취소에 실패했습니다." };

  return { ok: true };
}

/**
 * 운영자: 입금 기한 연장
 */
export async function extendPaymentDue(
  applicationId: string,
  newDueAt: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: app } = await supabase
    .from("tournament_team_applications")
    .select("status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app || app.status !== "payment_pending") {
    return { ok: false, error: "입금 대기 상태인 신청만 기한을 연장할 수 있습니다." };
  }

  const { error } = await supabase
    .from("tournament_team_applications")
    .update({ payment_due_at: newDueAt })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

// ────────────────────────────────────────────────────────────
// 디비전별 신청 현황 집계
// ────────────────────────────────────────────────────────────

export type DivisionApplicationCounts = {
  division_id: string;
  confirmed: number;
  waitlisted: number;
};

/**
 * 대회의 디비전별 confirmed/waitlisted 팀 수 집계 (organizer용)
 */
export async function getDivisionApplicationCounts(
  tournamentId: string
): Promise<{ data: DivisionApplicationCounts[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tournament_team_applications")
    .select("division_id, status")
    .eq("tournament_id", tournamentId)
    .in("status", ["confirmed", "waitlisted"]);

  if (error) return { data: [], error: error.message };

  const countsMap = new Map<string, DivisionApplicationCounts>();
  for (const row of (data ?? []) as { division_id: string; status: string }[]) {
    const existing = countsMap.get(row.division_id) ?? {
      division_id: row.division_id,
      confirmed: 0,
      waitlisted: 0,
    };
    if (row.status === "confirmed") existing.confirmed += 1;
    if (row.status === "waitlisted") existing.waitlisted += 1;
    countsMap.set(row.division_id, existing);
  }

  return { data: Array.from(countsMap.values()), error: null };
}

/**
 * 신청 상태 이력 조회
 */
export async function listStatusHistory(
  applicationId: string
): Promise<ApiResult<ApplicationStatusHistoryRow[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("application_status_history")
    .select("id, application_id, from_status, to_status, changed_by, changed_at, memo")
    .eq("application_id", applicationId)
    .order("changed_at", { ascending: true });

  if (error) return { data: null, error: error.message };

  return {
    data: (data ?? []) as ApplicationStatusHistoryRow[],
    error: null,
  };
}
