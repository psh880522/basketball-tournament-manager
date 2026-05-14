"use server";

import { redirect } from "next/navigation";
import { recordTermsConsentBatch } from "@/lib/api/terms";
import { TERMS_VERSIONS } from "@/lib/constants/terms";
import type { ActionResult } from "@/lib/types/api";
import type { TermsConsentInput } from "@/lib/types/terms";

type SaveTermsConsentInput = {
  agreeService: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
  next: string;
};

export async function saveTermsConsentAction(
  input: SaveTermsConsentInput
): Promise<ActionResult> {
  if (!input.agreeService || !input.agreePrivacy) {
    return { ok: false, error: "필수 약관에 동의해주세요." };
  }

  const consentInputs: TermsConsentInput[] = [
    { terms_type: "service",   terms_version: TERMS_VERSIONS.service,   agreed: true },
    { terms_type: "privacy",   terms_version: TERMS_VERSIONS.privacy,   agreed: true },
    { terms_type: "marketing", terms_version: TERMS_VERSIONS.marketing, agreed: input.agreeMarketing },
  ];

  const result = await recordTermsConsentBatch(consentInputs);
  if (!result.ok) {
    return { ok: false, error: "약관 동의 저장 중 오류가 발생했습니다." };
  }

  const safeNext = input.next.startsWith("/") ? input.next : "/onboarding/completion?step=signup";
  redirect(safeNext);
}
