"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCourtById } from "@/lib/api/courts";
import { getMatchById, updateMatchCourt } from "@/lib/api/matches";

type AssignInput = {
  matchId: string;
  courtId: string | null;
};

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function assignCourtToMatch(
  input: AssignInput
): Promise<ActionResult> {
  if (!input.matchId) {
    return { ok: false, error: "Missing match id." };
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

  if (input.courtId) {
    const courtResult = await getCourtById(input.courtId);

    if (courtResult.error) {
      return { ok: false, error: courtResult.error };
    }

    if (!courtResult.data) {
      return { ok: false, error: "Court not found." };
    }

    if (courtResult.data.tournament_id !== matchResult.data.tournament_id) {
      return { ok: false, error: "Court does not belong to tournament." };
    }
  }

  const updated = await updateMatchCourt(input.matchId, input.courtId ?? null);

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  return { ok: true };
}
