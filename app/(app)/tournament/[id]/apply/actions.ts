"use server";

import { applyToTournament } from "@/lib/api/applications";

type ApplyInput = {
  tournamentId: string;
  teamId: string;
  divisionId: string;
};

type ApplyResult = { ok: true } | { ok: false; error: string };

export async function applyTeamToTournament(
  input: ApplyInput
): Promise<ApplyResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "대회 ID가 없습니다." };
  }
  if (!input.teamId) {
    return { ok: false, error: "팀을 선택해주세요." };
  }
  if (!input.divisionId) {
    return { ok: false, error: "참가 구분(division)을 선택해주세요." };
  }

  return applyToTournament({
    tournamentId: input.tournamentId,
    teamId: input.teamId,
    divisionId: input.divisionId,
  });
}
