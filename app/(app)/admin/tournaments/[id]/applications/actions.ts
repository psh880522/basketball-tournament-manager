"use server";

import { revalidatePath } from "next/cache";
import { confirmApplication, adminCancelApplication, extendPaymentDue } from "@/lib/api/applications";
import { createDummyTeam } from "@/lib/api/teams";

export async function confirmApplicationAction(
  applicationId: string,
  tournamentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await confirmApplication(applicationId);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/applications`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);

  return { ok: true };
}

export async function adminCancelApplicationAction(
  applicationId: string,
  tournamentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await adminCancelApplication(applicationId);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/applications`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);

  return { ok: true };
}

export async function extendPaymentDueAction(
  applicationId: string,
  tournamentId: string,
  newDueAt: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await extendPaymentDue(applicationId, newDueAt);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/applications`);
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
