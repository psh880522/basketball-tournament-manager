"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import {
  createTeamApplication,
  getExistingTeamApplication,
} from "@/lib/api/teams";

type ApplyInput = {
  tournamentId: string;
  teamName: string;
  contact: string;
};

type ApplyResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function applyTeamToTournament(
  input: ApplyInput
): Promise<ApplyResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "Missing tournament id." };
  }

  if (!input.teamName.trim()) {
    return { ok: false, error: "Team name is required." };
  }

  if (!input.contact.trim()) {
    return { ok: false, error: "Contact is required." };
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return { ok: false, error: "Login required." };
  }

  if (userResult.status === "error") {
    return { ok: false, error: userResult.error ?? "Auth error." };
  }

  if (userResult.role !== "team_manager" || !userResult.user) {
    return { ok: false, error: "Forbidden." };
  }

  const existing = await getExistingTeamApplication(
    input.tournamentId,
    userResult.user.id
  );

  if (existing.error) {
    return { ok: false, error: existing.error };
  }

  if (existing.data) {
    return { ok: false, error: "You already applied to this tournament." };
  }

  const created = await createTeamApplication({
    tournament_id: input.tournamentId,
    team_name: input.teamName.trim(),
    captain_user_id: userResult.user.id,
    contact: input.contact.trim(),
    status: "pending",
  });

  if (created.error) {
    return { ok: false, error: created.error };
  }

  return { ok: true };
}
