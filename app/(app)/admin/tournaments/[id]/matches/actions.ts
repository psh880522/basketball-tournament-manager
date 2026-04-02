"use server";

import { getMatchById, updateMatchResult } from "@/lib/api/matches";
import { assertTournamentStepAllowed } from "@/lib/api/tournamentGuards";

type SubmitInput = {
  matchId: string;
  scoreA: string;
  scoreB: string;
};

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function submitMatchResult(
  input: SubmitInput
): Promise<ActionResult> {
  if (!input.matchId) {
    return { ok: false, error: "Missing match id." };
  }

  const scoreA = parseScore(input.scoreA);
  const scoreB = parseScore(input.scoreB);

  if (scoreA === null || scoreB === null) {
    return { ok: false, error: "Scores must be non-negative integers." };
  }

  if (scoreA === scoreB) {
    return { ok: false, error: "Draws are not allowed." };
  }

  const matchResult = await getMatchById(input.matchId);

  if (matchResult.error) {
    return { ok: false, error: matchResult.error };
  }

  if (!matchResult.data) {
    return { ok: false, error: "Match not found." };
  }

  const guard = await assertTournamentStepAllowed({
    tournamentId: matchResult.data.tournament_id,
    stepKey: "SUBMIT_RESULT",
  });

  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  if (matchResult.data.status !== "scheduled") {
    return { ok: false, error: "Match already completed." };
  }

  const winnerTeamId =
    scoreA > scoreB ? matchResult.data.team_a_id : matchResult.data.team_b_id;

  const updated = await updateMatchResult(input.matchId, {
    score_a: scoreA,
    score_b: scoreB,
    winner_team_id: winnerTeamId,
    status: "completed",
  });

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  if (!updated.data) {
    return { ok: false, error: "Failed to update match." };
  }

  return { ok: true };
}

const parseScore = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
};
