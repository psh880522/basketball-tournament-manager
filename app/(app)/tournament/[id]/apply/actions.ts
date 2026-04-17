"use server";

import { applyToTournament } from "@/lib/api/applications";
import { getOrCreateRoster, addRosterMember } from "@/lib/api/rosters";

type ApplyInput = {
  tournamentId: string;
  teamId: string;
  divisionId: string;
};

type ApplyResult = { ok: true; applicationId: string } | { ok: false; error: string };

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

type ApplyWithRosterResult =
  | { ok: true; applicationId: string; rosterWarning?: string }
  | { ok: false; error: string };

/**
 * 대회 참가 신청 + 초기 로스터 일괄 제출
 * 1. applyToTournament → applicationId
 * 2. getOrCreateRoster → rosterId
 * 3. addRosterMember × N (중복 참가 등 일부 실패 시 warning으로 처리)
 */
export async function applyWithRosterAction(input: {
  tournamentId: string;
  teamId: string;
  divisionId: string;
  memberIds: string[];
}): Promise<ApplyWithRosterResult> {
  if (!input.tournamentId) return { ok: false, error: "대회 ID가 없습니다." };
  if (!input.teamId) return { ok: false, error: "팀을 선택해주세요." };
  if (!input.divisionId) return { ok: false, error: "참가 구분(division)을 선택해주세요." };

  // 1. 신청
  const applyResult = await applyToTournament({
    tournamentId: input.tournamentId,
    teamId: input.teamId,
    divisionId: input.divisionId,
  });
  if (!applyResult.ok) return { ok: false, error: applyResult.error };

  const applicationId = applyResult.applicationId;

  // 선수 없으면 바로 완료
  if (input.memberIds.length === 0) {
    return { ok: true, applicationId };
  }

  // 2. 로스터 생성
  const rosterResult = await getOrCreateRoster(applicationId);
  if (!rosterResult.data) {
    return {
      ok: true,
      applicationId,
      rosterWarning: "로스터 생성에 실패했습니다. 신청 현황 페이지에서 직접 추가해주세요.",
    };
  }

  const rosterId = rosterResult.data.id;

  // 3. 선수 추가 (실패한 선수는 warning으로 수집)
  const failedNames: string[] = [];
  for (const userId of input.memberIds) {
    const result = await addRosterMember(rosterId, userId);
    if (!result.ok) {
      failedNames.push(result.error);
    }
  }

  if (failedNames.length > 0) {
    return {
      ok: true,
      applicationId,
      rosterWarning: `일부 선수가 추가되지 않았습니다: ${failedNames.join(" / ")}`,
    };
  }

  return { ok: true, applicationId };
}
