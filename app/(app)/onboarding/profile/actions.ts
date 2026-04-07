"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { updateMyProfile } from "@/lib/api/profiles";
import type { ProfileUpdateInput } from "@/lib/api/profiles";
import type { ActionResult } from "@/lib/types/api";

export async function saveOnboardingProfile(
  input: ProfileUpdateInput
): Promise<ActionResult> {
  // 1. 인증 확인
  const userResult = await getUserWithRole();
  if (userResult.status !== "ready") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  // 2. 필수 필드 검증
  if (!input.display_name?.trim()) {
    return { ok: false, error: "이름을 입력해주세요." };
  }
  if (!input.phone?.trim()) {
    return { ok: false, error: "연락처를 입력해주세요." };
  }

  // 3. 저장 위임
  return updateMyProfile(input);
}
