"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { createMatches, getDivisionById, getTournamentStatus } from "@/lib/api/bracket";
import { getTournamentMatchesByDivision, getTournamentMatchesByRound } from "@/lib/api/matches";
import { getStandingsByDivision } from "@/lib/api/standings";

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type SeedPair = {
  teamAId: string;
  teamBId: string;
};

type RoundName = "quarterfinal" | "semifinal" | "final";

export async function generateSeededBracket(formData: FormData): Promise<ActionResult> {
  const tournamentId = toText(formData.get("tournamentId"));
  const divisionId = toText(formData.get("divisionId"));

  if (!tournamentId || !divisionId) {
    return redirectWithError(tournamentId, divisionId, "Missing identifiers.");
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return redirectWithError(tournamentId, divisionId, "Login required.");
  }

  if (userResult.status === "error") {
    return redirectWithError(
      tournamentId,
      divisionId,
      userResult.error ?? "Auth error."
    );
  }

  if (userResult.role !== "organizer") {
    return redirectWithError(tournamentId, divisionId, "Forbidden.");
  }

  const tournament = await getTournamentStatus(tournamentId);

  if (tournament.error) {
    return redirectWithError(tournamentId, divisionId, tournament.error);
  }

  if (!tournament.data) {
    return redirectWithError(tournamentId, divisionId, "Tournament not found.");
  }

  if (tournament.data.status !== "closed") {
    return redirectWithError(
      tournamentId,
      divisionId,
      "Tournament must be closed."
    );
  }

  const division = await getDivisionById(divisionId);

  if (division.error) {
    return redirectWithError(tournamentId, divisionId, division.error);
  }

  if (!division.data) {
    return redirectWithError(tournamentId, divisionId, "Division not found.");
  }

  if (division.data.tournament_id !== tournamentId) {
    return redirectWithError(tournamentId, divisionId, "Invalid division.");
  }

  const standings = await getStandingsByDivision(divisionId);

  if (standings.error) {
    return redirectWithError(tournamentId, divisionId, standings.error);
  }

  const seeded = standings.data ?? [];

  if (seeded.length === 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "순위가 계산되지 않아 토너먼트를 생성할 수 없습니다."
    );
  }

  if (seeded.length < 8) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "Standings 팀 수가 8팀 미만입니다."
    );
  }

  const existingMatches = await getTournamentMatchesByDivision(divisionId);

  if (existingMatches.error) {
    return redirectWithError(tournamentId, divisionId, existingMatches.error);
  }

  if (existingMatches.data && existingMatches.data.length > 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "Tournament matches already exist."
    );
  }

  const seeds = seeded.slice(0, 8);
  const pairs = buildSeedPairs(seeds);

  if (pairs.length < 4) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "Standings rank 정보가 부족합니다."
    );
  }

  const matchEntries = pairs.map((pair) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    group_id: null,
    round: "quarterfinal",
    team_a_id: pair.teamAId,
    team_b_id: pair.teamBId,
    status: "scheduled",
    court_id: null,
  }));

  const created = await createMatches(matchEntries);

  if (created.error) {
    return redirectWithError(tournamentId, divisionId, created.error);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket/tournament`);

  return redirectWithSuccess(tournamentId, divisionId);
}

export async function advanceTournamentRound(
  formData: FormData
): Promise<ActionResult> {
  const tournamentId = toText(formData.get("tournamentId"));
  const divisionId = toText(formData.get("divisionId"));
  const currentRound = toText(formData.get("currentRound")) as RoundName;

  if (!tournamentId || !divisionId || !currentRound) {
    return redirectWithError(tournamentId, divisionId, "Missing identifiers.");
  }

  if (!isRoundName(currentRound)) {
    return redirectWithError(tournamentId, divisionId, "Invalid round.");
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return redirectWithError(tournamentId, divisionId, "Login required.");
  }

  if (userResult.status === "error") {
    return redirectWithError(
      tournamentId,
      divisionId,
      userResult.error ?? "Auth error."
    );
  }

  if (userResult.role !== "organizer") {
    return redirectWithError(tournamentId, divisionId, "Forbidden.");
  }

  const currentMatches = await getTournamentMatchesByRound(
    divisionId,
    currentRound
  );

  if (currentMatches.error) {
    return redirectWithError(tournamentId, divisionId, currentMatches.error);
  }

  const matches = currentMatches.data ?? [];

  if (matches.length === 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "현재 라운드 경기가 없습니다."
    );
  }

  const allCompleted = matches.every((match) => match.status === "completed");

  if (!allCompleted) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "아직 완료되지 않은 경기가 있습니다."
    );
  }

  if (currentRound === "final") {
    return redirectWithError(
      tournamentId,
      divisionId,
      "토너먼트가 종료되었습니다."
    );
  }

  const nextRound = currentRound === "quarterfinal" ? "semifinal" : "final";
  const nextMatches = await getTournamentMatchesByRound(divisionId, nextRound);

  if (nextMatches.error) {
    return redirectWithError(tournamentId, divisionId, nextMatches.error);
  }

  if (nextMatches.data && nextMatches.data.length > 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "이미 다음 라운드가 생성되었습니다."
    );
  }

  const expectedCount = currentRound === "quarterfinal" ? 4 : 2;
  if (matches.length !== expectedCount) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "현재 라운드 경기 수가 올바르지 않습니다."
    );
  }

  const pairs = buildNextRoundPairs(currentRound, matches);

  if (pairs.length === 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "승자 정보가 부족합니다."
    );
  }

  const matchEntries = pairs.map((pair) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    group_id: null,
    round: nextRound,
    team_a_id: pair.teamAId,
    team_b_id: pair.teamBId,
    status: "scheduled",
    court_id: null,
  }));

  const created = await createMatches(matchEntries);

  if (created.error) {
    return redirectWithError(tournamentId, divisionId, created.error);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket/tournament`);

  return redirectWithSuccess(tournamentId, divisionId, nextRound);
}

const toText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const buildSeedPairs = (
  seeds: { team_id: string; rank: number }[]
): SeedPair[] => {
  const byRank = new Map<number, string>();
  seeds.forEach((seed) => {
    byRank.set(seed.rank, seed.team_id);
  });

  return [
    { teamAId: byRank.get(1) ?? "", teamBId: byRank.get(8) ?? "" },
    { teamAId: byRank.get(2) ?? "", teamBId: byRank.get(7) ?? "" },
    { teamAId: byRank.get(3) ?? "", teamBId: byRank.get(6) ?? "" },
    { teamAId: byRank.get(4) ?? "", teamBId: byRank.get(5) ?? "" },
  ].filter((pair) => pair.teamAId && pair.teamBId);
};

const buildRedirectUrl = (
  tournamentId: string,
  divisionId: string,
  error?: string,
  nextRound?: string
) => {
  const params = new URLSearchParams();
  params.set("divisionId", divisionId);
  if (error) params.set("error", error);
  if (!error) {
    params.set("success", "1");
    if (nextRound) params.set("nextRound", nextRound);
  }
  return `/admin/tournaments/${tournamentId}/bracket/tournament?${params.toString()}`;
};

const redirectWithError = (
  tournamentId: string,
  divisionId: string,
  message: string
): ActionResult => {
  redirect(buildRedirectUrl(tournamentId, divisionId, message));
  return { ok: false, error: message };
};

const redirectWithSuccess = (
  tournamentId: string,
  divisionId: string,
  nextRound?: string
): ActionResult => {
  redirect(buildRedirectUrl(tournamentId, divisionId, undefined, nextRound));
  return { ok: true };
};

const isRoundName = (value: string): value is RoundName =>
  value === "quarterfinal" || value === "semifinal" || value === "final";

const buildNextRoundPairs = (
  round: RoundName,
  matches: { winner_team_id: string | null }[]
): SeedPair[] => {
  if (round === "quarterfinal") {
    if (matches.length !== 4) return [];
    const winners = matches.map((match) => match.winner_team_id ?? "");
    if (winners.some((winner) => !winner)) return [];
    return [
      { teamAId: winners[0], teamBId: winners[3] },
      { teamAId: winners[1], teamBId: winners[2] },
    ];
  }

  if (matches.length !== 2) return [];
  const winners = matches.map((match) => match.winner_team_id ?? "");
  if (winners.some((winner) => !winner)) return [];
  return [{ teamAId: winners[0], teamBId: winners[1] }];
};
