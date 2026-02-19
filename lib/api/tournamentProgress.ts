import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type TournamentProgressState =
  | "TEAM_APPROVAL"
  | "GROUP_STAGE_GENERATED"
  | "MATCH_IN_PROGRESS"
  | "STANDINGS_READY"
  | "BRACKET_READY"
  | "TOURNAMENT_FINISHED";

type NextAction = {
  label: string;
  url: string;
  disabled: boolean;
  reason: string | null;
};

type ProgressSummary = {
  approvedTeams: number;
  groups: number;
  groupMatches: number;
  completedGroupMatches: number;
  standings: number;
  tournamentMatches: number;
  finalCompleted: boolean;
  tournamentStatus: "draft" | "open" | "closed";
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

  const { data: divisions, error: divisionsError } = await supabase
    .from("divisions")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (divisionsError) {
    return { data: null, error: divisionsError.message };
  }

  const divisionIds = (divisions ?? []).map((division) => division.id);

  const approvedTeamsResult = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "approved");

  if (approvedTeamsResult.error) {
    return { data: null, error: approvedTeamsResult.error.message };
  }

  const groupsCount = await countGroupsByDivisionIds(divisionIds);

  if (groupsCount.error) {
    return { data: null, error: groupsCount.error };
  }

  const groupMatchesResult = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .not("group_id", "is", null);

  if (groupMatchesResult.error) {
    return { data: null, error: groupMatchesResult.error.message };
  }

  const completedGroupMatchesResult = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .not("group_id", "is", null)
    .eq("status", "completed");

  if (completedGroupMatchesResult.error) {
    return { data: null, error: completedGroupMatchesResult.error.message };
  }

  const standingsResult = await supabase
    .from("standings")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (standingsResult.error) {
    return { data: null, error: standingsResult.error.message };
  }

  const tournamentMatchesResult = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .is("group_id", null);

  if (tournamentMatchesResult.error) {
    return { data: null, error: tournamentMatchesResult.error.message };
  }

  const finalCompletedResult = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .is("group_id", null)
    .eq("round", "final")
    .eq("status", "completed");

  if (finalCompletedResult.error) {
    return { data: null, error: finalCompletedResult.error.message };
  }

  const summary: ProgressSummary = {
    approvedTeams: approvedTeamsResult.count ?? 0,
    groups: groupsCount.count,
    groupMatches: groupMatchesResult.count ?? 0,
    completedGroupMatches: completedGroupMatchesResult.count ?? 0,
    standings: standingsResult.count ?? 0,
    tournamentMatches: tournamentMatchesResult.count ?? 0,
    finalCompleted: (finalCompletedResult.count ?? 0) > 0,
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
  if (summary.finalCompleted) return "TOURNAMENT_FINISHED";
  if (summary.tournamentMatches > 0) return "BRACKET_READY";
  if (summary.standings > 0) return "STANDINGS_READY";
  if (summary.completedGroupMatches > 0) return "MATCH_IN_PROGRESS";
  if (summary.groups > 0 && summary.groupMatches > 0) {
    return "GROUP_STAGE_GENERATED";
  }
  return "TEAM_APPROVAL";
};

const resolveNextAction = (
  tournamentId: string,
  state: TournamentProgressState,
  summary: ProgressSummary
): NextAction => {
  if (state === "TEAM_APPROVAL") {
    return {
      label: "팀 승인하기",
      url: `/admin/tournaments/${tournamentId}/teams`,
      disabled: false,
      reason: null,
    };
  }

  if (state === "GROUP_STAGE_GENERATED") {
    return {
      label: "경기 결과 입력하기",
      url: `/admin/tournaments/${tournamentId}/matches`,
      disabled: false,
      reason: null,
    };
  }

  if (state === "MATCH_IN_PROGRESS") {
    return {
      label: "순위 계산하기",
      url: `/admin/tournaments/${tournamentId}/standings`,
      disabled: false,
      reason: null,
    };
  }

  if (state === "STANDINGS_READY") {
    const isClosed = summary.tournamentStatus === "closed";
    const hasMinimumTeams = summary.standings >= 8;
    const isDisabled = !isClosed || !hasMinimumTeams;
    return {
      label: "토너먼트 생성하기",
      url: `/admin/tournaments/${tournamentId}/bracket/tournament`,
      disabled: isDisabled,
      reason: !isClosed
        ? "대회 상태가 closed여야 합니다."
        : hasMinimumTeams
        ? null
        : "토너먼트는 8팀 이상 필요합니다.",
    };
  }

  if (state === "BRACKET_READY") {
    return {
      label: "다음 라운드 생성하기",
      url: `/admin/tournaments/${tournamentId}/bracket/tournament`,
      disabled: false,
      reason: null,
    };
  }

  return {
    label: "토너먼트 종료",
    url: "",
    disabled: true,
    reason: "토너먼트가 종료되었습니다.",
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
