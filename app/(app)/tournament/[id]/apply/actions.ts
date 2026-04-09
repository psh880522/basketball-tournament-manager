"use server";

import { revalidatePath } from "next/cache";
import { applyToTournament, markPaymentDone, cancelApplication } from "@/lib/api/applications";
import type { MarkPaymentInput } from "@/lib/api/applications";

type ApplyInput = {
  tournamentId: string;
  teamId: string;
  divisionId: string;
};

type ApplyResult = { ok: true } | { ok: false; error: string };

export async function applyTeamToTournament(
  input: ApplyInput
): Promise<ApplyResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "대회 ID가 없습니다." };
  }
  if (!input.teamId) {
    return { ok: false, error: "팀을 선택해주세요." };
  }
  if (!input.divisionId) {
    return { ok: false, error: "참가 구분(division)을 선택해주세요." };
  }

  return applyToTournament({
    tournamentId: input.tournamentId,
    teamId: input.teamId,
    divisionId: input.divisionId,
  });
}

export async function markPaymentDoneAction(
  tournamentId: string,
  input: MarkPaymentInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await markPaymentDone(input);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/tournament/${tournamentId}/apply`);
  return { ok: true };
}

export async function cancelApplicationAction(
  applicationId: string,
  tournamentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await cancelApplication(applicationId);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/tournament/${tournamentId}/apply`);
  return { ok: true };
}
