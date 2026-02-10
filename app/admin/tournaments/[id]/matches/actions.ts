"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { getMatchById, updateMatchResult } from "@/lib/api/matches";

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

  const matchResult = await getMatchById(input.matchId);

  if (matchResult.error) {
    return { ok: false, error: matchResult.error };
  }

  if (!matchResult.data) {
    return { ok: false, error: "Match not found." };
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
