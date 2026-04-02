"use server";

import {
  changeTournamentStatus,
  restoreTournament,
  softDeleteTournament,
  type TournamentStatus,
} from "@/lib/api/tournaments";

export async function softDeleteTournamentAction(tournamentId: string) {
  return softDeleteTournament(tournamentId);
}

export async function restoreTournamentAction(tournamentId: string) {
  return restoreTournament(tournamentId);
}

export async function changeTournamentStatusAction(
  tournamentId: string,
  nextStatus: TournamentStatus
) {
  return changeTournamentStatus(tournamentId, nextStatus);
}
