"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCaptainTeams } from "@/lib/api/teams";
import {
  createPlayer as createPlayerRecord,
  deletePlayer as deletePlayerRecord,
  getPlayerById,
  updatePlayer as updatePlayerRecord,
} from "@/lib/api/players";

type PlayerInput = {
  name: string;
  number: string;
  position: string;
};

type CreateInput = PlayerInput & {
  teamId: string;
};

type UpdateInput = PlayerInput & {
  playerId: string;
  teamId: string;
};

type DeleteInput = {
  playerId: string;
  teamId: string;
};

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

const parseNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizePosition = (value: string) =>
  value.trim() ? value.trim() : null;

export async function createPlayer(input: CreateInput): Promise<ActionResult> {
  if (!input.teamId) {
    return { ok: false, error: "Missing team id." };
  }

  if (!input.name.trim()) {
    return { ok: false, error: "Name is required." };
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

  const teams = await getCaptainTeams(userResult.user.id);

  if (teams.error) {
    return { ok: false, error: teams.error };
  }

  if (!teams.data || teams.data.length === 0) {
    return { ok: false, error: "No team found." };
  }

  const ownsTeam = teams.data.some((team) => team.id === input.teamId);

  if (!ownsTeam) {
    return { ok: false, error: "Invalid team." };
  }

  const created = await createPlayerRecord(input.teamId, {
    name: input.name.trim(),
    number: parseNumber(input.number),
    position: normalizePosition(input.position),
  });

  if (created.error) {
    return { ok: false, error: created.error };
  }

  return { ok: true };
}

export async function updatePlayer(input: UpdateInput): Promise<ActionResult> {
  if (!input.playerId || !input.teamId) {
    return { ok: false, error: "Missing identifiers." };
  }

  if (!input.name.trim()) {
    return { ok: false, error: "Name is required." };
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

  const player = await getPlayerById(input.playerId);

  if (player.error) {
    return { ok: false, error: player.error };
  }

  if (!player.data) {
    return { ok: false, error: "Player not found." };
  }

  if (player.data.team_id !== input.teamId) {
    return { ok: false, error: "Invalid team for player." };
  }

  const updated = await updatePlayerRecord(input.playerId, {
    name: input.name.trim(),
    number: parseNumber(input.number),
    position: normalizePosition(input.position),
  });

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  return { ok: true };
}

export async function deletePlayer(input: DeleteInput): Promise<ActionResult> {
  if (!input.playerId || !input.teamId) {
    return { ok: false, error: "Missing identifiers." };
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return { ok: false, error: "Login required." };
  }

  if (userResult.status === "error") {
    return { ok: false, error: userResult.error ?? "Auth error." };
  }

  if (userResult.role !== "team_manager") {
    return { ok: false, error: "Forbidden." };
  }

  const player = await getPlayerById(input.playerId);

  if (player.error) {
    return { ok: false, error: player.error };
  }

  if (!player.data) {
    return { ok: false, error: "Player not found." };
  }

  if (player.data.team_id !== input.teamId) {
    return { ok: false, error: "Invalid team for player." };
  }

  const deleted = await deletePlayerRecord(input.playerId);

  if (deleted.error) {
    return { ok: false, error: deleted.error };
  }

  return { ok: true };
}
