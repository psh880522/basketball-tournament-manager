"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGroups,
  createMatches,
  getDivisionById,
  getTournamentStatus,
} from "@/lib/api/bracket";
import {
  getTournamentMatchesByDivision,
  getTournamentMatchesByGroupName,
} from "@/lib/api/matches";
import { getStandingsByDivision } from "@/lib/api/standings";
import { assertTournamentStepAllowed } from "@/lib/api/tournamentGuards";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

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

type RoundName = "round_of_16" | "quarterfinal" | "semifinal" | "final";

const TOURNAMENT_GROUP_ORDER: Record<RoundName | "third_place", number> = {
  round_of_16: 1,
  quarterfinal: 2,
  semifinal: 3,
  final: 4,
  third_place: 5,
};

async function ensureTournamentGroup(
  divisionId: string,
  name: RoundName | "third_place"
): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id")
    .eq("division_id", divisionId)
    .eq("type", "tournament")
    .eq("name", name)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (data?.id) return { ok: true, groupId: data.id as string };

  const created = await createGroups(divisionId, [
    { name, order: TOURNAMENT_GROUP_ORDER[name] ?? 999, type: "tournament" },
  ]);
  if (created.error) return { ok: false, error: created.error };
  const group = (created.data ?? [])[0];
  if (!group) return { ok: false, error: "토너먼트 그룹 생성에 실패했습니다." };
  return { ok: true, groupId: group.id };
}

export async function generateSeededBracket(formData: FormData): Promise<void> {
  const tournamentId = toText(formData.get("tournamentId"));
  const divisionId = toText(formData.get("divisionId"));

  if (!tournamentId || !divisionId) {
    return redirectWithError(tournamentId, divisionId, "Missing identifiers.");
  }

  const guard = await assertTournamentStepAllowed({
    tournamentId,
    divisionId,
    stepKey: "GENERATE_BRACKET",
  });

  if (!guard.ok) {
    return redirectWithError(tournamentId, divisionId, guard.error);
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

  const supabase = await createSupabaseServerClient();
  const { count: existingGroups, error: groupErr } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId)
    .eq("type", "tournament");

  if (groupErr) {
    return redirectWithError(tournamentId, divisionId, groupErr.message);
  }
  if ((existingGroups ?? 0) > 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "Tournament groups already exist."
    );
  }

  const bracketSize = seeded.length >= 16 ? 16 : 8;
  const seeds = seeded.slice(0, bracketSize);
  const pairs = buildSeedPairs(seeds, bracketSize);

  if (pairs.length < (bracketSize === 16 ? 8 : 4)) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "Standings rank 정보가 부족합니다."
    );
  }

  const roundNames: (RoundName | "third_place")[] =
    bracketSize === 16
      ? ["round_of_16", "quarterfinal", "semifinal", "final", "third_place"]
      : ["quarterfinal", "semifinal", "final", "third_place"];

  const groupDefs = roundNames.map((name) => ({
    name,
    order: TOURNAMENT_GROUP_ORDER[name] ?? 999,
    type: "tournament",
  }));

  const groupsResult = await createGroups(divisionId, groupDefs);
  if (groupsResult.error) {
    return redirectWithError(tournamentId, divisionId, groupsResult.error);
  }

  const groupMap = new Map(
    (groupsResult.data ?? []).map((group) => [group.name, group.id])
  );

  const firstRound = bracketSize === 16 ? "round_of_16" : "quarterfinal";
  const firstGroupId = groupMap.get(firstRound);
  if (!firstGroupId) {
    return redirectWithError(tournamentId, divisionId, "라운드 그룹이 없습니다.");
  }

  const matchEntries: {
    tournament_id: string;
    division_id: string;
    group_id: string;
    team_a_id: string | null;
    team_b_id: string | null;
    status: string;
    court_id: string | null;
  }[] = pairs.map((pair) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    group_id: firstGroupId,
    team_a_id: pair.teamAId,
    team_b_id: pair.teamBId,
    status: "scheduled",
    court_id: null,
  }));

  const pushEmptyMatches = (name: RoundName | "third_place", count: number) => {
    const groupId = groupMap.get(name);
    if (!groupId) return;
    for (let i = 0; i < count; i += 1) {
      matchEntries.push({
        tournament_id: tournamentId,
        division_id: divisionId,
        group_id: groupId,
        team_a_id: null,
        team_b_id: null,
        status: "scheduled",
        court_id: null,
      });
    }
  };

  if (bracketSize === 16) {
    pushEmptyMatches("quarterfinal", 4);
  }
  pushEmptyMatches("semifinal", 2);
  pushEmptyMatches("final", 1);
  pushEmptyMatches("third_place", 1);

  const created = await createMatches(matchEntries);

  if (created.error) {
    return redirectWithError(tournamentId, divisionId, created.error);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket/tournament`);

  return redirectWithSuccess(tournamentId, divisionId);
}

export async function advanceTournamentRound(
  formData: FormData
): Promise<void> {
  const tournamentId = toText(formData.get("tournamentId"));
  const divisionId = toText(formData.get("divisionId"));
  const currentRound = toText(formData.get("currentRound")) as RoundName;

  if (!tournamentId || !divisionId || !currentRound) {
    return redirectWithError(tournamentId, divisionId, "Missing identifiers.");
  }

  if (!isRoundName(currentRound)) {
    return redirectWithError(tournamentId, divisionId, "Invalid round.");
  }

  const guard = await assertTournamentStepAllowed({
    tournamentId,
    divisionId,
    stepKey: "ADVANCE_ROUND",
    currentRound,
  });

  if (!guard.ok) {
    return redirectWithError(tournamentId, divisionId, guard.error);
  }

  const currentMatches = await getTournamentMatchesByGroupName(
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

  const expectedCount =
    currentRound === "round_of_16"
      ? 8
      : currentRound === "quarterfinal"
      ? 4
      : 2;
  if (matches.length !== expectedCount) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "현재 라운드 경기 수가 올바르지 않습니다."
    );
  }

  if (currentRound === "round_of_16" || currentRound === "quarterfinal") {
    const nextRound =
      currentRound === "round_of_16" ? "quarterfinal" : "semifinal";
    const nextMatches = await getTournamentMatchesByGroupName(divisionId, nextRound);

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

    const pairs = buildNextRoundPairs(currentRound, matches);

    if (pairs.length === 0) {
      return redirectWithError(
        tournamentId,
        divisionId,
        "승자 정보가 부족합니다."
      );
    }

    const nextGroup = await ensureTournamentGroup(divisionId, nextRound);
    if (!nextGroup.ok) {
      return redirectWithError(tournamentId, divisionId, nextGroup.error);
    }

    const matchEntries = pairs.map((pair) => ({
      tournament_id: tournamentId,
      division_id: divisionId,
      group_id: nextGroup.groupId,
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

  const finalMatches = await getTournamentMatchesByGroupName(divisionId, "final");
  if (finalMatches.error) {
    return redirectWithError(tournamentId, divisionId, finalMatches.error);
  }
  if (finalMatches.data && finalMatches.data.length > 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "이미 다음 라운드가 생성되었습니다."
    );
  }

  const thirdPlaceMatches = await getTournamentMatchesByGroupName(
    divisionId,
    "third_place"
  );
  if (thirdPlaceMatches.error) {
    return redirectWithError(tournamentId, divisionId, thirdPlaceMatches.error);
  }
  if (thirdPlaceMatches.data && thirdPlaceMatches.data.length > 0) {
    return redirectWithError(
      tournamentId,
      divisionId,
      "이미 다음 라운드가 생성되었습니다."
    );
  }

  const winners = matches.map((match) => match.winner_team_id ?? "");
  if (winners.some((winner) => !winner)) {
    return redirectWithError(tournamentId, divisionId, "승자 정보가 부족합니다.");
  }

  const losers = matches.map((match) => {
    const winner = match.winner_team_id;
    const teamA = match.team_a?.id ?? null;
    const teamB = match.team_b?.id ?? null;
    if (!winner || !teamA || !teamB) return "";
    return winner === teamA ? teamB : winner === teamB ? teamA : "";
  });
  if (losers.some((loser) => !loser)) {
    return redirectWithError(tournamentId, divisionId, "패자 정보가 부족합니다.");
  }

  const finalGroup = await ensureTournamentGroup(divisionId, "final");
  if (!finalGroup.ok) {
    return redirectWithError(tournamentId, divisionId, finalGroup.error);
  }
  const thirdGroup = await ensureTournamentGroup(divisionId, "third_place");
  if (!thirdGroup.ok) {
    return redirectWithError(tournamentId, divisionId, thirdGroup.error);
  }

  const matchEntries = [
    {
      tournament_id: tournamentId,
      division_id: divisionId,
      group_id: finalGroup.groupId,
      team_a_id: winners[0],
      team_b_id: winners[1],
      status: "scheduled",
      court_id: null,
    },
    {
      tournament_id: tournamentId,
      division_id: divisionId,
      group_id: thirdGroup.groupId,
      team_a_id: losers[0],
      team_b_id: losers[1],
      status: "scheduled",
      court_id: null,
    },
  ];

  const created = await createMatches(matchEntries);

  if (created.error) {
    return redirectWithError(tournamentId, divisionId, created.error);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket/tournament`);

  return redirectWithSuccess(tournamentId, divisionId, "final");
}

const toText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const buildSeedPairs = (
  seeds: { team_id: string; rank: number }[],
  bracketSize: number
): SeedPair[] => {
  const byRank = new Map<number, string>();
  seeds.forEach((seed) => {
    byRank.set(seed.rank, seed.team_id);
  });

  if (bracketSize === 16) {
    return [
      { teamAId: byRank.get(1) ?? "", teamBId: byRank.get(16) ?? "" },
      { teamAId: byRank.get(8) ?? "", teamBId: byRank.get(9) ?? "" },
      { teamAId: byRank.get(5) ?? "", teamBId: byRank.get(12) ?? "" },
      { teamAId: byRank.get(4) ?? "", teamBId: byRank.get(13) ?? "" },
      { teamAId: byRank.get(6) ?? "", teamBId: byRank.get(11) ?? "" },
      { teamAId: byRank.get(3) ?? "", teamBId: byRank.get(14) ?? "" },
      { teamAId: byRank.get(7) ?? "", teamBId: byRank.get(10) ?? "" },
      { teamAId: byRank.get(2) ?? "", teamBId: byRank.get(15) ?? "" },
    ].filter((pair) => pair.teamAId && pair.teamBId);
  }

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
): never => {
  redirect(buildRedirectUrl(tournamentId, divisionId, message));
};

const redirectWithSuccess = (
  tournamentId: string,
  divisionId: string,
  nextRound?: string
): never => {
  redirect(buildRedirectUrl(tournamentId, divisionId, undefined, nextRound));
};

const isRoundName = (value: string): value is RoundName =>
  value === "round_of_16" || value === "quarterfinal" || value === "semifinal" || value === "final";

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

  if (round === "round_of_16") {
    if (matches.length !== 8) return [];
    const winners = matches.map((match) => match.winner_team_id ?? "");
    if (winners.some((winner) => !winner)) return [];
    return [
      { teamAId: winners[0], teamBId: winners[1] },
      { teamAId: winners[2], teamBId: winners[3] },
      { teamAId: winners[4], teamBId: winners[5] },
      { teamAId: winners[6], teamBId: winners[7] },
    ];
  }

  return [];
};
