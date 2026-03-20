"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { saveMatchResult } from "@/lib/api/matches";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveMatchScoreAction(
  matchId: string,
  scoreA: number,
  scoreB: number,
  tournamentId: string
): Promise<ActionResult> {
  const auth = await getUserWithRole();

  if (auth.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (auth.status === "error" || auth.status === "empty") {
    return { ok: false, error: "인증 오류가 발생했습니다." };
  }
  if (auth.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }

  if (!Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0) {
    return { ok: false, error: "점수는 0 이상의 정수여야 합니다." };
  }

  const result = await saveMatchResult({
    matchId,
    scoreA,
    scoreB,
    status: "scheduled",
  });
  if (!result.ok) return result;

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true };
}

export async function completeMatchAction(
  matchId: string,
  scoreA: number,
  scoreB: number,
  tournamentId: string
): Promise<ActionResult> {
  const auth = await getUserWithRole();

  if (auth.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (auth.status === "error" || auth.status === "empty") {
    return { ok: false, error: "인증 오류가 발생했습니다." };
  }
  if (auth.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }

  if (!Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0) {
    return { ok: false, error: "점수는 0 이상의 정수여야 합니다." };
  }

  const result = await saveMatchResult({
    matchId,
    scoreA,
    scoreB,
    status: "completed",
  });
  if (!result.ok) return result;

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true };
}
