"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { updateMyProfile } from "@/lib/api/profiles";
import { upsertMyPlayerProfile } from "@/lib/api/player-profile";
import { recordTermsConsentBatch } from "@/lib/api/terms";
import { TERMS_VERSIONS } from "@/lib/constants/terms";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types/api";
import type { PlayerProfileUpdateInput } from "@/lib/types/player";

type OnboardingProfileInput = {
  display_name?: string;
  player_registration_consent: boolean;
  tournament_notification_consent: boolean;
  basic_info_usage_consent: boolean;
} & PlayerProfileUpdateInput;

export async function saveOnboardingProfile(
  input: OnboardingProfileInput
): Promise<ActionResult> {
  // 1. 인증 확인
  const userResult = await getUserWithRole();
  if (userResult.status !== "ready") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  // 2. 필수 항목 서버 검증
  if (!input.gender) {
    return { ok: false, error: "성별을 선택해주세요." };
  }
  if (!input.position) {
    return { ok: false, error: "주 포지션을 선택해주세요." };
  }
  if (input.height_cm == null) {
    return { ok: false, error: "신장을 입력해주세요." };
  }
  if (!input.career_level) {
    return { ok: false, error: "경력 수준을 선택해주세요." };
  }
  if (!input.region?.trim()) {
    return { ok: false, error: "활동 지역을 입력해주세요." };
  }

  // 3. 동의 검증
  if (
    !input.player_registration_consent ||
    !input.tournament_notification_consent ||
    !input.basic_info_usage_consent
  ) {
    return { ok: false, error: "필수 동의 항목을 모두 확인해주세요." };
  }

  // 4. display_name 저장 (입력된 경우만)
  if (input.display_name?.trim()) {
    const profileResult = await updateMyProfile({
      display_name: input.display_name,
    });
    if (!profileResult.ok) return profileResult;
  }

  // 5. player_profiles upsert
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    display_name: _dn,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    player_registration_consent: _pr,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tournament_notification_consent: _tn,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    basic_info_usage_consent: _bi,
    ...playerFields
  } = input;

  const playerResult = await upsertMyPlayerProfile(playerFields);
  if (!playerResult.ok) return playerResult;

  // 6. 선수 등록 동의 일괄 저장
  const consentResult = await recordTermsConsentBatch([
    { terms_type: "player_registration", terms_version: TERMS_VERSIONS.player_registration, agreed: true },
    { terms_type: "tournament_notification", terms_version: TERMS_VERSIONS.tournament_notification, agreed: true },
    { terms_type: "basic_info_usage", terms_version: TERMS_VERSIONS.basic_info_usage, agreed: true },
  ]);
  if (!consentResult.ok) return consentResult;

  revalidatePath("/onboarding/profile");
  return { ok: true };
}
