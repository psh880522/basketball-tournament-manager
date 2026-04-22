import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult } from "@/lib/types/api";
import type { DashboardSummary, PendingAction } from "@/lib/types/dashboard";

/* ── getMyDashboardSummary ──────────────────────────────────────────────── */

export async function getMyDashboardSummary(
  pendingActionCount: number = 0
): Promise<ApiResult<DashboardSummary>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data: members, error: memErr } = await supabase
    .from("team_members")
    .select("team_id, role_in_team")
    .eq("user_id", user.id);

  if (memErr) return { data: null, error: memErr.message };

  const allTeamIds = (members ?? []).map((m) => m.team_id as string);
  const captainTeamIds = (members ?? [])
    .filter((m) => m.role_in_team === "captain")
    .map((m) => m.team_id as string);

  if (allTeamIds.length === 0) {
    return {
      data: {
        teamCount: 0,
        captainTeamCount: 0,
        activeApplicationCount: 0,
        thisWeekMatchCount: 0,
        pendingActionCount: 0,
      },
      error: null,
    };
  }

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [appsResult, matchesResult] = await Promise.all([
    supabase
      .from("tournament_team_applications")
      .select("id, tournaments!inner(status)")
      .in("team_id", allTeamIds)
      .eq("status", "confirmed")
      .neq("tournaments.status", "finished"),

    supabase
      .from("matches")
      .select("id")
      .or(
        `team_a_id.in.(${allTeamIds.join(",")}),team_b_id.in.(${allTeamIds.join(",")})`
      )
      .eq("status", "scheduled")
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", weekLater.toISOString()),
  ]);

  return {
    data: {
      teamCount: allTeamIds.length,
      captainTeamCount: captainTeamIds.length,
      activeApplicationCount: (appsResult.data ?? []).length,
      thisWeekMatchCount: (matchesResult.data ?? []).length,
      pendingActionCount,
    },
    error: null,
  };
}

/* ── getMyPendingActions ────────────────────────────────────────────────── */

export async function getMyPendingActions(): Promise<ApiResult<PendingAction[]>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data: captainMemberships, error: memErr } = await supabase
    .from("team_members")
    .select("team_id, teams(team_name)")
    .eq("user_id", user.id)
    .eq("role_in_team", "captain");

  if (memErr) return { data: null, error: memErr.message };

  const captainTeams = (captainMemberships ?? []).map(
    (m: Record<string, unknown>) => ({
      teamId: m.team_id as string,
      teamName: ((m.teams as { team_name: string } | null)?.team_name) ?? "",
    })
  );

  if (captainTeams.length === 0) return { data: [], error: null };

  const captainTeamIds = captainTeams.map((t) => t.teamId);

  const [paymentApps, confirmedApps, joinRequests] = await Promise.all([
    // Action 1: 입금 대기 신청
    supabase
      .from("tournament_team_applications")
      .select("id, team_id, payment_due_at, tournaments!inner(name, status)")
      .in("team_id", captainTeamIds)
      .eq("status", "payment_pending")
      .neq("tournaments.status", "finished"),

    // Action 2: 참가 확정 + 로스터 비어있는 신청
    supabase
      .from("tournament_team_applications")
      .select("id, team_id, tournaments!inner(name, status), rosters(id, roster_members(id))")
      .in("team_id", captainTeamIds)
      .eq("status", "confirmed")
      .neq("tournaments.status", "finished"),

    // Action 3: 팀 가입 신청 pending 건수
    supabase
      .from("team_join_applications")
      .select("id, team_id")
      .in("team_id", captainTeamIds)
      .eq("status", "pending"),
  ]);

  const actions: PendingAction[] = [];
  const teamMap = new Map(captainTeams.map((t) => [t.teamId, t.teamName]));

  // 입금 대기 액션
  for (const app of (paymentApps.data ?? []) as Record<string, unknown>[]) {
    const teamId = app.team_id as string;
    const tournament = app.tournaments as { name: string } | null;
    const dueAt = app.payment_due_at as string | null;
    actions.push({
      type: "payment",
      teamId,
      teamName: teamMap.get(teamId) ?? "",
      applicationId: app.id as string,
      tournamentName: tournament?.name ?? "",
      label: "입금 완료 표시 필요",
      href: `/my-applications/${app.id}`,
      urgency: "high",
      meta: dueAt
        ? `납입 기한: ${new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(dueAt))}`
        : undefined,
    });
  }

  // 로스터 미작성 액션
  for (const app of (confirmedApps.data ?? []) as Record<string, unknown>[]) {
    // rosters.application_id에 UNIQUE 제약이 있어 PostgREST가 배열 대신 단일 객체로 반환할 수 있음
    const rosterRaw = app.rosters as
      | { id: string; roster_members: { id: string }[] }
      | { id: string; roster_members: { id: string }[] }[]
      | null;
    const roster = Array.isArray(rosterRaw) ? (rosterRaw[0] ?? null) : (rosterRaw ?? null);
    const rosterMemberCount = roster?.roster_members?.length ?? 0;

    if (rosterMemberCount === 0) {
      const teamId = app.team_id as string;
      const tournament = app.tournaments as { name: string } | null;
      actions.push({
        type: "roster",
        teamId,
        teamName: teamMap.get(teamId) ?? "",
        applicationId: app.id as string,
        tournamentName: tournament?.name ?? "",
        label: "로스터 작성 필요",
        href: `/my-applications/${app.id}`,
        urgency: "medium",
        meta: "0명 등록됨",
      });
    }
  }

  // 팀 가입 신청 대기 액션 (팀별로 묶기)
  const joinCountByTeam = new Map<string, number>();
  for (const req of (joinRequests.data ?? []) as Record<string, unknown>[]) {
    const teamId = req.team_id as string;
    joinCountByTeam.set(teamId, (joinCountByTeam.get(teamId) ?? 0) + 1);
  }
  for (const [teamId, count] of joinCountByTeam.entries()) {
    actions.push({
      type: "team_join_approval",
      teamId,
      teamName: teamMap.get(teamId) ?? "",
      label: `팀원 신청 ${count}건 승인 대기`,
      href: `/teams/${teamId}/applications`,
      urgency: "low",
      meta: `${count}건`,
    });
  }

  // urgency 순 정렬: high → medium → low
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return { data: actions, error: null };
}
