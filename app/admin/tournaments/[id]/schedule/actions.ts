"use server";

import { generateSchedule, bulkSaveSchedule } from "@/lib/api/schedule";
import { createScheduleSlot } from "@/lib/api/scheduleSlots";
import {
  clearSchedule,
  generateScheduleTimes,
  saveSchedule,
  seedBreakSlots,
  seedGroupMatchSlots,
  seedTournamentMatchSlots,
  reorderGroupSlots,
  reorderTournamentSlots,
  updateSlotCourt,
} from "@/lib/api/schedule-slots";
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

export async function createScheduleSlotAction(
  tournamentId: string,
  slotType: "break" | "maintenance" | "buffer",
  startAt: string,
  endAt: string,
  label?: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await createScheduleSlot({
    tournamentId,
    slotType,
    startAt,
    endAt,
    label,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function seedGroupMatchSlotsAction(
  tournamentId: string,
  divisionId: string,
  groupSize: number
): Promise<ActionResult> {
  const result = await seedGroupMatchSlots({
    tournamentId,
    divisionId,
    groupSize,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function seedTournamentMatchSlotsAction(
  tournamentId: string,
  divisionId: string,
  tournamentSize: number,
  assignToTournament: boolean
): Promise<ActionResult> {
  const result = await seedTournamentMatchSlots({
    tournamentId,
    divisionId,
    tournamentSize,
    assignToTournament,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function seedBreakSlotsAction(
  tournamentId: string,
  divisionId: string,
  stageType: "group" | "tournament",
  groupKey?: string | null
): Promise<ActionResult> {
  const result = await seedBreakSlots({
    tournamentId,
    divisionId,
    stageType,
    groupKey: groupKey ?? null,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function reorderGroupSlotsAction(
  tournamentId: string,
  divisionId: string,
  groupKey: string,
  orderedSlotIds: string[]
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!divisionId || !groupKey) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!orderedSlotIds.length) {
    return { ok: false, error: "변경할 슬롯이 없습니다." };
  }

  const result = await reorderGroupSlots({
    divisionId,
    groupKey,
    orderedSlotIds,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function reorderTournamentSlotsAction(
  tournamentId: string,
  divisionId: string,
  orderedSlotIds: string[]
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!orderedSlotIds.length) {
    return { ok: false, error: "변경할 슬롯이 없습니다." };
  }

  const result = await reorderTournamentSlots({
    divisionId,
    orderedSlotIds,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function updateSlotCourtAction(
  tournamentId: string,
  slotId: string,
  courtId: string | null
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!slotId) return { ok: false, error: "슬롯 정보가 없습니다." };

  const result = await updateSlotCourt({
    slotId,
    courtId,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function generateScheduleTimesAction(
  tournamentId: string,
  input: {
    startTime: string;
    matchDurationMinutes: number;
    breakDurationMinutes: number;
  }
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await generateScheduleTimes({
    tournamentId,
    startTime: input.startTime,
    matchDurationMinutes: input.matchDurationMinutes,
    breakDurationMinutes: input.breakDurationMinutes,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function saveScheduleAction(
  tournamentId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await saveSchedule(tournamentId);

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function clearScheduleAction(
  tournamentId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await clearSchedule(tournamentId);

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}
