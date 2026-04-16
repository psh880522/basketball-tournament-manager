"use server";

import {
  approveTeamApplication,
  rejectTeamApplication,
} from "@/lib/api/team-applications";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types/api";

export async function approveApplicationAction(
  applicationId: string,
  teamId: string
): Promise<ActionResult> {
  const result = await approveTeamApplication(applicationId);
  if (!result.ok) return result;

  revalidatePath(`/teams/${teamId}/applications`);
  return { ok: true };
}

export async function rejectApplicationAction(
  applicationId: string,
  teamId: string
): Promise<ActionResult> {
  const result = await rejectTeamApplication(applicationId);
  if (!result.ok) return result;

  revalidatePath(`/teams/${teamId}/applications`);
  return { ok: true };
}
