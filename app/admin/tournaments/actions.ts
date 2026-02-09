"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import {
  isTournamentStatus,
  updateTournamentStatus as updateStatus,
} from "@/lib/api/tournaments";

type UpdateResult = {
  ok: boolean;
  message: string;
};

type UpdateInput = {
  tournamentId: string;
  status: string;
};

export async function updateTournamentStatus(
  input: UpdateInput
): Promise<UpdateResult> {
  if (!input.tournamentId) {
    return { ok: false, message: "Missing tournament id." };
  }

  if (!isTournamentStatus(input.status)) {
    return { ok: false, message: "Invalid status." };
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return { ok: false, message: "Login required." };
  }

  if (userResult.status === "error") {
    return { ok: false, message: userResult.error ?? "Auth error." };
  }

  if (userResult.role !== "organizer") {
    return { ok: false, message: "Forbidden." };
  }

  const { error } = await updateStatus(input.tournamentId, input.status);

  if (error) {
    return { ok: false, message: error };
  }

  return { ok: true, message: "Saved." };
}
