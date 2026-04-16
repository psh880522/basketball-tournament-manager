"use server";

import { applyForTeam } from "@/lib/api/team-applications";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types/api";

export async function applyForTeamAction(
  teamId: string
): Promise<ActionResult> {
  const result = await applyForTeam(teamId);
  if (!result.ok) return result;

  revalidatePath("/teams/find");
  return { ok: true };
}
