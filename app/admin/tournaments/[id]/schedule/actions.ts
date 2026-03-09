"use server";

import { generateSchedule, bulkSaveSchedule } from "@/lib/api/schedule";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function generateScheduleAction(
  tournamentId: string,
  startAt: string,
  intervalMinutes: number
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!startAt) return { ok: false, error: "시작 시간을 입력하세요." };
  if (!intervalMinutes || intervalMinutes < 1) {
    return { ok: false, error: "경기 간격은 1분 이상이어야 합니다." };
  }

  const result = await generateSchedule({
    tournamentId,
    startAt,
    intervalMinutes,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }
  return result;
}

export async function bulkSaveScheduleAction(
  tournamentId: string,
  updates: { matchId: string; scheduledAt: string | null; courtId: string | null }[]
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!updates.length) return { ok: false, error: "변경사항이 없습니다." };

  const result = await bulkSaveSchedule({ tournamentId, updates });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }
  return result;
}
