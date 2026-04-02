"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import {
  getTeamApplicationById,
  getTournamentSummary,
  updateTeamStatus,
} from "@/lib/api/teams";

type UpdateInput = {
  tournamentId: string;
  teamId: string;
  status: "approved" | "rejected";
};

type UpdateResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function updateTeamApplicationStatus(
  input: UpdateInput
): Promise<UpdateResult> {
  if (!input.tournamentId || !input.teamId) {
    return { ok: false, error: "Missing identifiers." };
  }

  if (input.status !== "approved" && input.status !== "rejected") {
    return { ok: false, error: "Invalid status." };
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return { ok: false, error: "Login required." };
  }

  if (userResult.status === "error") {
    return { ok: false, error: userResult.error ?? "Auth error." };
  }

  if (userResult.role !== "organizer") {
    return { ok: false, error: "Forbidden." };
  }

  const tournament = await getTournamentSummary(input.tournamentId);

  if (tournament.error) {
    return { ok: false, error: tournament.error };
  }

  if (!tournament.data) {
    return { ok: false, error: "Tournament not found." };
  }

  if (tournament.data.status !== "open") {
    return { ok: false, error: "Tournament is not open." };
  }

  const team = await getTeamApplicationById(input.teamId);

  if (team.error) {
    return { ok: false, error: team.error };
  }

  if (!team.data) {
    return { ok: false, error: "Team not found." };
  }

  if (team.data.tournament_id !== input.tournamentId) {
    return { ok: false, error: "Team does not belong to this tournament." };
  }

  if (team.data.status !== "pending") {
    return { ok: false, error: "Team is already processed." };
  }

  const updated = await updateTeamStatus(input.teamId, input.status);

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  return { ok: true };
}
