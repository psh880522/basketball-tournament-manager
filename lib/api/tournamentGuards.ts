import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";

type GuardResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export type TournamentGuardStep =
  | "GENERATE_GROUP_STAGE"
  | "ASSIGN_COURT"
  | "SUBMIT_RESULT"
  | "RECALC_STANDINGS"
  | "GENERATE_BRACKET"
  | "ADVANCE_ROUND";

type GuardInput = {
  tournamentId: string;
  divisionId?: string;
  stepKey: TournamentGuardStep;
  currentRound?: string;
};

export async function assertTournamentStepAllowed(
  input: GuardInput
): Promise<GuardResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "Missing tournament id." };
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return { ok: false, error: "Login required." };
  }

  if (userResult.status === "error") {
    return { ok: false, error: userResult.error ?? "Auth error." };
  }

  if (userResult.role !== "organizer") {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await createSupabaseServerClient();
  const tournamentResult = await supabase
    .from("tournaments")
    .select("id,status")
    .eq("id", input.tournamentId)
    .maybeSingle();

  if (tournamentResult.error) {
    return { ok: false, error: tournamentResult.error.message };
  }

  if (!tournamentResult.data) {
    return { ok: false, error: "Tournament not found." };
  }

  if (tournamentResult.data.status === "finished") {
    return { ok: false, error: "대회가 종료되었습니다." };
  }

  if (input.stepKey === "GENERATE_GROUP_STAGE") {
    if (!input.divisionId) {
      return { ok: false, error: "Missing division id." };
    }

    const approvedTeamsResult = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId)
      .eq("status", "approved");

    if (approvedTeamsResult.error) {
      return { ok: false, error: approvedTeamsResult.error.message };
    }

    if ((approvedTeamsResult.count ?? 0) < 2) {
      return { ok: false, error: "Not enough approved teams." };
    }

    const groupsResult = await supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId);

    if (groupsResult.error) {
      return { ok: false, error: groupsResult.error.message };
    }

    const groupMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId)
      .not("group_id", "is", null);

    if (groupMatchesResult.error) {
      return { ok: false, error: groupMatchesResult.error.message };
    }

    if ((groupsResult.count ?? 0) > 0 && (groupMatchesResult.count ?? 0) > 0) {
      return { ok: false, error: "이미 조/경기가 생성되었습니다." };
    }

    return { ok: true };
  }

  if (input.stepKey === "ASSIGN_COURT" || input.stepKey === "SUBMIT_RESULT") {
    const groupMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", input.tournamentId)
      .not("group_id", "is", null);

    if (groupMatchesResult.error) {
      return { ok: false, error: groupMatchesResult.error.message };
    }

    if ((groupMatchesResult.count ?? 0) === 0) {
      return { ok: false, error: "먼저 조/경기를 생성하세요." };
    }

    return { ok: true };
  }

  if (input.stepKey === "RECALC_STANDINGS") {
    const completedMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", input.tournamentId)
      .not("group_id", "is", null)
      .eq("status", "completed");

    if (completedMatchesResult.error) {
      return { ok: false, error: completedMatchesResult.error.message };
    }

    if ((completedMatchesResult.count ?? 0) === 0) {
      return { ok: false, error: "완료된 경기가 없습니다." };
    }

    return { ok: true };
  }

  if (input.stepKey === "GENERATE_BRACKET") {
    if (!input.divisionId) {
      return { ok: false, error: "Missing division id." };
    }

    if (tournamentResult.data.status !== "closed") {
      return { ok: false, error: "Tournament must be closed." };
    }

    const standingsResult = await supabase
      .from("standings")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId);

    if (standingsResult.error) {
      return { ok: false, error: standingsResult.error.message };
    }

    const standingsCount = standingsResult.count ?? 0;

    if (standingsCount === 0) {
      return {
        ok: false,
        error: "순위가 계산되지 않아 토너먼트를 생성할 수 없습니다.",
      };
    }

    if (standingsCount < 8) {
      return { ok: false, error: "Standings 팀 수가 8팀 미만입니다." };
    }

    const bracketMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId)
      .is("group_id", null)
      .eq("round", "quarterfinal");

    if (bracketMatchesResult.error) {
      return { ok: false, error: bracketMatchesResult.error.message };
    }

    if ((bracketMatchesResult.count ?? 0) > 0) {
      return { ok: false, error: "Tournament matches already exist." };
    }

    return { ok: true };
  }

  if (input.stepKey === "ADVANCE_ROUND") {
    if (!input.divisionId) {
      return { ok: false, error: "Missing division id." };
    }

    if (!input.currentRound) {
      return { ok: false, error: "Invalid round." };
    }

    const currentMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId)
      .is("group_id", null)
      .eq("round", input.currentRound);

    if (currentMatchesResult.error) {
      return { ok: false, error: currentMatchesResult.error.message };
    }

    if ((currentMatchesResult.count ?? 0) === 0) {
      return { ok: false, error: "현재 라운드 경기가 없습니다." };
    }

    const incompleteMatchesResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId)
      .is("group_id", null)
      .eq("round", input.currentRound)
      .neq("status", "completed");

    if (incompleteMatchesResult.error) {
      return { ok: false, error: incompleteMatchesResult.error.message };
    }

    if ((incompleteMatchesResult.count ?? 0) > 0) {
      return { ok: false, error: "아직 완료되지 않은 경기가 있습니다." };
    }

    if (input.currentRound === "final") {
      return { ok: false, error: "토너먼트가 종료되었습니다." };
    }

    const nextRound =
      input.currentRound === "quarterfinal" ? "semifinal" : "final";

    const nextRoundResult = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("division_id", input.divisionId)
      .is("group_id", null)
      .eq("round", nextRound);

    if (nextRoundResult.error) {
      return { ok: false, error: nextRoundResult.error.message };
    }

    if ((nextRoundResult.count ?? 0) > 0) {
      return { ok: false, error: "이미 다음 라운드가 생성되었습니다." };
    }

    return { ok: true };
  }

  return { ok: true };
}
