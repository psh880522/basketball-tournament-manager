"use server";

import { revalidatePath } from "next/cache";
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
  type Player,
} from "@/lib/api/players";

export async function createPlayerAction(
  teamId: string,
  input: Omit<Player, "id" | "team_id">
) {
  const result = await createPlayer(teamId, input);
  if (!result.error) revalidatePath(`/teams/${teamId}`);
  return result;
}

export async function updatePlayerAction(
  teamId: string,
  playerId: string,
  input: Omit<Player, "id" | "team_id">
) {
  const result = await updatePlayer(playerId, input);
  if (!result.error) revalidatePath(`/teams/${teamId}`);
  return result;
}

export async function deletePlayerAction(teamId: string, playerId: string) {
  const result = await deletePlayer(playerId);
  if (!result.error) revalidatePath(`/teams/${teamId}`);
  return result;
}
