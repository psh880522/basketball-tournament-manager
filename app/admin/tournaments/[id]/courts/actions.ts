"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { createCourt, deleteCourt, findCourtByName } from "@/lib/api/courts";

type CreateInput = {
  tournamentId: string;
  name: string;
};

type DeleteInput = {
  courtId: string;
};

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function createCourtAction(
  input: CreateInput
): Promise<ActionResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "Missing tournament id." };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Court name is required." };
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

  const existing = await findCourtByName(input.tournamentId, name);

  if (existing.error) {
    return { ok: false, error: existing.error };
  }

  if (existing.data) {
    return { ok: false, error: "Court name already exists." };
  }

  const created = await createCourt(input.tournamentId, name);

  if (created.error) {
    return { ok: false, error: created.error };
  }

  return { ok: true };
}

export async function deleteCourtAction(
  input: DeleteInput
): Promise<ActionResult> {
  if (!input.courtId) {
    return { ok: false, error: "Missing court id." };
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

  const deleted = await deleteCourt(input.courtId);

  if (deleted.error) {
    return { ok: false, error: deleted.error };
  }

  return { ok: true };
}
