"use server";

import { revalidatePath } from "next/cache";
import {
  calculateLeagueStandings,
  confirmLeagueStandings,
  seedTournamentTeamsFromConfirmedStandings,
  saveLeagueResult,
  saveTournamentResult,
} from "@/lib/api/results";

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

type LeagueResultInput = {
  matchId: string;
  scoreA: number;
  scoreB: number;
};

export async function saveLeagueResultsAction(input: {
  tournamentId: string;
  divisionId: string;
  results: LeagueResultInput[];
}): Promise<ActionResult> {
  const { tournamentId, results } = input;

  if (!tournamentId) {
    return { ok: false, error: "대회 정보가 없습니다." };
  }
  if (!results.length) {
    return { ok: false, error: "저장할 경기 결과가 없습니다." };
  }

  for (const result of results) {
    const saved = await saveLeagueResult(result);
    if (!saved.ok) return saved;
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true };
}

export async function calculateLeagueStandingsAction(input: {
  tournamentId: string;
  divisionId: string;
}): Promise<ActionResult> {
  const { tournamentId, divisionId } = input;

  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const result = await calculateLeagueStandings(divisionId);
  if (!result.ok) return result;

  const confirmResult = await confirmLeagueStandings(divisionId);
  if (!confirmResult.ok) return confirmResult;

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true };
}

export async function confirmLeagueStandingsAction(input: {
  tournamentId: string;
  divisionId: string;
}): Promise<ActionResult> {
  const { tournamentId, divisionId } = input;

  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const result = await confirmLeagueStandings(divisionId);
  if (!result.ok) return result;

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true };
}

export async function seedTournamentTeamsAction(input: {
  tournamentId: string;
  divisionId: string;
}): Promise<ActionResult> {
  const { tournamentId, divisionId } = input;

  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const result = await seedTournamentTeamsFromConfirmedStandings(divisionId);
  if (!result.ok) return result;

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true };
}

export async function saveTournamentResultAction(input: {
  tournamentId: string;
  divisionId: string;
  matchId: string;
  scoreA: number;
  scoreB: number;
}): Promise<ActionResult> {
  const { tournamentId, divisionId, matchId, scoreA, scoreB } = input;

  if (!tournamentId || !divisionId || !matchId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const result = await saveTournamentResult({ matchId, scoreA, scoreB });
  if (!result.ok) return result;

  revalidatePath(`/admin/tournaments/${tournamentId}/result`);
  return { ok: true, message: result.message };
}
