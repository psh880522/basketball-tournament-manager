"use server";

import { revalidatePath } from "next/cache";
import { setApplicationStatus } from "@/lib/api/applications";
import { createDummyTeam } from "@/lib/api/teams";

export async function setApplicationStatusAction(
  applicationId: string,
  status: "approved" | "rejected",
  tournamentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await setApplicationStatus(applicationId, status);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/applications`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);

  return { ok: true };
}

export async function createDummyTeamAction(
  tournamentId: string,
  divisionId: string,
  name?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await createDummyTeam({ tournamentId, divisionId, name });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/applications`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);

  return { ok: true };
}
