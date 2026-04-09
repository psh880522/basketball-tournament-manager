import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult } from "@/lib/types/api";

export type TournamentProgressState =
  | "TEAM_APPROVAL"
  | "MATCH_GENERATION"
  | "SCHEDULE"
  | "RESULT"
  | "TOURNAMENT_FINISHED";

type NextAction = {
  label: string;
  url: string;
  disabled: boolean;
  reason: string | null;
};

type ProgressSummary = {
  approvedTeams: number;
  totalTeams: number;
  totalMatches: number;
  completedMatches: number;
  groups: number;
  groupMatches: number;
  completedGroupMatches: number;
  standings: number;
  tournamentMatches: number;
  finalExists: boolean;
  finalCompleted: boolean;
  courtsCount: number;
  scheduledMatches: number;
  tournamentStatus: "draft" | "open" | "closed" | "finished";
};

type ProgressResult = {
  tournamentId: string;
  tournamentName: string;
  state: TournamentProgressState;
  nextAction: NextAction;
  summary: ProgressSummary;
};

export async function getTournamentProgressState(
  tournamentId: string
): Promise<ApiResult<ProgressResult>> {
  const supabase = await createSupabaseServerClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id,name,status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    return { data: null, error: tournamentError.message };
  }

  if (!tournament) {
    return { data: null, error: "Tournament not found." };
  }

  // groups count depends on division IDs — chain it as a single promise
  const groupsCountPromise = supabase
    .from("divisions")
    .select("id")
    .eq("tournament_id", tournamentId)
    .then(({ data, error }) => {
      if (error) return { count: 0, error: error.message };
      return countGroupsByDivisionIds((data ?? []).map((d) => d.id));
    });

  const [
    approvedTeamsResult,
    totalTeamsResult,
    groupMatchesResult,
    completedGroupMatchesResult,
    standingsResult,
    totalMatchesResult,
    completedMatchesResult,
    tournamentMatchesResult,
    finalCompletedResult,
    finalExistsResult,
    courtsCountResult,
    scheduledMatchesResult,
    groupsCount,
  ] = await Promise.all([
    supabase
      .from("tournament_team_applications")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "confirmed"),
    supabase
      .from("tournament_team_applications")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("id,group:groups!matches_group_id_fkey!inner(type)", {
        count: "exact",
        head: true,
      })
      .eq("tournament_id", tournamentId)
      .eq("group.type", "league"),
    supabase
      .from("matches")
      .select("id,group:groups!matches_group_id_fkey!inner(type)", {
        count: "exact",
        head: true,
      })
      .eq("tournament_id", tournamentId)
      .eq("group.type", "league")
      .eq("status", "completed"),
    supabase
      .from("standings")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "completed"),
    supabase
      .from("matches")
      .select("id,group:groups!matches_group_id_fkey!inner(type)", {
        count: "exact",
        head: true,
      })
      .eq("tournament_id", tournamentId)
      .eq("group.type", "tournament"),
    supabase
      .from("matches")
      .select("id,group:groups!matches_group_id_fkey!inner(name,type)", {
        count: "exact",
        head: true,
      })
      .eq("tournament_id", tournamentId)
      .eq("group.type", "tournament")
      .eq("group.name", "final")
      .eq("status", "completed"),
    supabase
      .from("matches")
      .select("id,group:groups!matches_group_id_fkey!inner(name,type)", {
        count: "exact",
        head: true,
      })
      .eq("tournament_id", tournamentId)
      .eq("group.type", "tournament")
      .eq("group.name", "final"),
    supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .not("scheduled_at", "is", null),
    groupsCountPromise,
  ]);

  if (approvedTeamsResult.error) return { data: null, error: approvedTeamsResult.error.message };
  if (totalTeamsResult.error) return { data: null, error: totalTeamsResult.error.message };
  if (groupMatchesResult.error) return { data: null, error: groupMatchesResult.error.message };
  if (completedGroupMatchesResult.error) return { data: null, error: completedGroupMatchesResult.error.message };
  if (standingsResult.error) return { data: null, error: standingsResult.error.message };
  if (totalMatchesResult.error) return { data: null, error: totalMatchesResult.error.message };
  if (completedMatchesResult.error) return { data: null, error: completedMatchesResult.error.message };
  if (tournamentMatchesResult.error) return { data: null, error: tournamentMatchesResult.error.message };
  if (finalCompletedResult.error) return { data: null, error: finalCompletedResult.error.message };
  if (finalExistsResult.error) return { data: null, error: finalExistsResult.error.message };
  if (courtsCountResult.error) return { data: null, error: courtsCountResult.error.message };
  if (scheduledMatchesResult.error) return { data: null, error: scheduledMatchesResult.error.message };
  if (groupsCount.error) return { data: null, error: groupsCount.error };

  const summary: ProgressSummary = {
    approvedTeams: approvedTeamsResult.count ?? 0,
    totalTeams: totalTeamsResult.count ?? 0,
    totalMatches: totalMatchesResult.count ?? 0,
    completedMatches: completedMatchesResult.count ?? 0,
    groups: groupsCount.count,
    groupMatches: groupMatchesResult.count ?? 0,
    completedGroupMatches: completedGroupMatchesResult.count ?? 0,
    standings: standingsResult.count ?? 0,
    tournamentMatches: tournamentMatchesResult.count ?? 0,
    finalExists: (finalExistsResult.count ?? 0) > 0,
    finalCompleted: (finalCompletedResult.count ?? 0) > 0,
    courtsCount: courtsCountResult.count ?? 0,
    scheduledMatches: scheduledMatchesResult.count ?? 0,
    tournamentStatus: tournament.status,
  };

  const state = resolveState(summary);
  const nextAction = resolveNextAction(tournamentId, state, summary);

  return {
    data: {
      tournamentId,
      tournamentName: tournament.name,
      state,
      nextAction,
      summary,
    },
    error: null,
  };
}

const resolveState = (summary: ProgressSummary): TournamentProgressState => {
  if (summary.tournamentStatus === "finished" || summary.finalCompleted) {
    return "TOURNAMENT_FINISHED";
  }

  if (summary.totalTeams > 0 && summary.approvedTeams < summary.totalTeams) {
    return "TEAM_APPROVAL";
  }

  if (summary.totalMatches === 0) {
    return "MATCH_GENERATION";
  }

  if (summary.scheduledMatches < summary.totalMatches) {
    return "SCHEDULE";
  }

  return "RESULT";
};

const resolveNextAction = (
  tournamentId: string,
  state: TournamentProgressState,
  summary: ProgressSummary
): NextAction => {
  if (state === "TEAM_APPROVAL") {
    return {
      label: "팀 승인하기",
      url: `/admin/tournaments/${tournamentId}/applications`,
      disabled: false,
      reason: null,
    };
  }

  if (state === "MATCH_GENERATION") {
    const disabled = summary.approvedTeams < 2;
    return {
      label: "경기 생성하기",
      url: `/admin/tournaments/${tournamentId}/bracket`,
      disabled,
      reason: disabled ? "승인 팀 2팀 이상 필요" : null,
    };
  }

  if (state === "SCHEDULE") {
    const disabled = summary.totalMatches === 0 || summary.courtsCount === 0;
    return {
      label: "스케줄 생성하기",
      url: `/admin/tournaments/${tournamentId}/schedule`,
      disabled,
      reason: summary.totalMatches === 0
        ? "먼저 경기 생성을 완료하세요"
        : summary.courtsCount === 0
        ? "코트를 먼저 추가하세요"
        : null,
    };
  }

  if (state === "RESULT") {
    const disabled = summary.totalMatches === 0;
    const preferStandings = summary.completedMatches === summary.totalMatches;
    return {
      label: preferStandings ? "순위 계산하기" : "결과 입력하기",
      url: preferStandings
        ? `/admin/tournaments/${tournamentId}/standings`
        : `/admin/tournaments/${tournamentId}/result`,
      disabled,
      reason: disabled ? "경기가 없습니다" : null,
    };
  }

  return {
    label: "대회 종료",
    url: "",
    disabled: true,
    reason: "대회가 종료되었습니다.",
  };
};

const countGroupsByDivisionIds = async (divisionIds: string[]) => {
  if (divisionIds.length === 0) {
    return { count: 0, error: null };
  }
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .in("division_id", divisionIds);

  return {
    count: count ?? 0,
    error: error ? error.message : null,
  };
};
