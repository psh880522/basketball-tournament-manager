"use server";

import { revalidatePath } from "next/cache";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { toggleTeamAttendance } from "@/lib/api/attendance";
import type { ActionResult } from "@/lib/types/api";

export async function toggleAttendanceAction(
  tournamentId: string,
  teamId: string,
  attended: boolean
): Promise<ActionResult> {
  const userResult = await getUserWithRole();
  if (userResult.status !== "ready" || userResult.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }

  const result = await toggleTeamAttendance(tournamentId, teamId, attended);
  if (!result.ok) return result;

  revalidatePath(`/admin/tournaments/${tournamentId}/attendance`);
  return { ok: true };
}
