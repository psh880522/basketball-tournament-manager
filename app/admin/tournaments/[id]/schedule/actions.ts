"use server";

import { generateSchedule, bulkSaveSchedule } from "@/lib/api/schedule";
import {
  clearSchedule,
  clearScheduleSync,
  generateScheduleTimes,
  regenerateScheduleBoard,
  resetScheduleBoard,
  saveSchedule,
  syncScheduleToMatches,
  validateScheduleBeforeSync,
  seedBreakSlots,
  seedGroupMatchSlots,
  seedTournamentMatchSlots,
  reorderGroupSlots,
  reorderTournamentSlots,
  updateSlotCourt,
  generateScheduleSlots,
  clearGeneratedScheduleSlots,
  swapSlotMatchAssignments,
  assignMatchToEmptySlot,
  unassignMatchFromSlot,
  addBreakSlot,
  deleteBreakSlot,
  updateSlotDuration,
  updateSlotType,
  reorderCourtDivisionSlots,
  recalculateCourtSlotTimes,
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
    tournamentId,
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

export async function generateScheduleSlotsAction(
  tournamentId: string,
  input: {
    startTime: string;
    matchDurationMinutes: number;
    breakDurationMinutes: number;
  }
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!input.startTime) return { ok: false, error: "시작 시간을 입력하세요." };
  if (!input.matchDurationMinutes || input.matchDurationMinutes <= 0) {
    return { ok: false, error: "경기 시간은 1분 이상이어야 합니다." };
  }
  if (input.breakDurationMinutes < 0) {
    return { ok: false, error: "휴식 시간은 0분 이상이어야 합니다." };
  }

  const result = await generateScheduleSlots({
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

export async function regenerateScheduleBoardAction(
  tournamentId: string,
  input: {
    startTime: string;
    matchDurationMinutes: number;
    breakDurationMinutes: number;
  }
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!input.startTime) return { ok: false, error: "시작 시간을 입력하세요." };
  if (!input.matchDurationMinutes || input.matchDurationMinutes <= 0) {
    return { ok: false, error: "경기 시간은 1분 이상이어야 합니다." };
  }
  if (input.breakDurationMinutes < 0) {
    return { ok: false, error: "휴식 시간은 0분 이상이어야 합니다." };
  }

  const result = await regenerateScheduleBoard({
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

export async function clearGeneratedScheduleSlotsAction(
  tournamentId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await clearGeneratedScheduleSlots({ tournamentId });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function resetScheduleBoardAction(
  tournamentId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await resetScheduleBoard(tournamentId);

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

export async function syncScheduleToMatchesAction(
  tournamentId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await syncScheduleToMatches(tournamentId);

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function validateScheduleBeforeSyncAction(tournamentId: string) {
  return validateScheduleBeforeSync(tournamentId);
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

export async function clearScheduleSyncAction(
  tournamentId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await clearScheduleSync(tournamentId);

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function swapSlotMatchAssignmentsAction(
  tournamentId: string,
  sourceSlotId: string,
  targetSlotId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await swapSlotMatchAssignments({
    sourceSlotId,
    targetSlotId,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function assignMatchToEmptySlotAction(
  tournamentId: string,
  slotId: string,
  matchId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await assignMatchToEmptySlot({
    slotId,
    matchId,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function unassignMatchFromSlotAction(
  tournamentId: string,
  slotId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await unassignMatchFromSlot({ slotId });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function addBreakSlotAction(
  tournamentId: string,
  courtId: string,
  divisionId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await addBreakSlot({ tournamentId, courtId, divisionId });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function deleteBreakSlotAction(
  tournamentId: string,
  slotId: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await deleteBreakSlot({ tournamentId, slotId });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function updateSlotDurationAction(
  tournamentId: string,
  slotId: string,
  durationMinutes: number
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await updateSlotDuration({ tournamentId, slotId, durationMinutes });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function updateSlotTypeAction(
  tournamentId: string,
  slotId: string,
  type: "group" | "tournament" | "break"
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await updateSlotType({ tournamentId, slotId, type });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function reorderCourtDivisionSlotsAction(
  tournamentId: string,
  courtId: string | null,
  divisionId: string | null,
  orderedSlotIds: string[]
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await reorderCourtDivisionSlots({
    tournamentId,
    courtId,
    divisionId,
    orderedSlotIds,
  });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}

export async function recalculateCourtSlotsAction(
  tournamentId: string,
  courtId: string | null
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await recalculateCourtSlotTimes({ tournamentId, courtId });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}
