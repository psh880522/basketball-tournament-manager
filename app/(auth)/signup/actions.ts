"use server";

import { redirect } from "next/navigation";
import { signUpWithPassword as signUp } from "@/lib/api/auth";
import { recordTermsConsentBatch } from "@/lib/api/terms";
import { TERMS_VERSIONS } from "@/lib/constants/terms";
import type { TermsConsentInput } from "@/lib/types/terms";

type SignUpActionResult =
  | { ok: true; requiresEmailConfirmation: boolean }
  | { ok: false; error: string };

type SignUpInput = {
  email: string;
  password: string;
  agreeService: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
};

function translateSignUpError(message: string): string {
  const map: Record<string, string> = {
    "User already registered": "이미 가입된 이메일입니다.",
    "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
    "Unable to validate email address: invalid format": "올바른 이메일 형식을 입력하세요.",
    "Email rate limit exceeded": "잠시 후 다시 시도해주세요.",
    "Signup requires a valid password": "비밀번호를 입력하세요.",
  };
  return map[message] ?? "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export async function signUpWithPassword(
  input: SignUpInput
): Promise<SignUpActionResult> {
  if (!input.email.trim() || !input.password.trim()) {
    return { ok: false, error: "이메일과 비밀번호를 입력하세요." };
  }

  if (input.password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  if (!input.agreeService || !input.agreePrivacy) {
    return { ok: false, error: "필수 약관에 동의해주세요." };
  }

  const result = await signUp(input.email.trim(), input.password);

  if (result.error) {
    return { ok: false, error: translateSignUpError(result.error) };
  }

  // 가입 성공 후 약관 동의 이력 저장 (저장 실패 시 가입 흐름 계속 진행)
  const consentInputs: TermsConsentInput[] = [
    { terms_type: "service",   terms_version: TERMS_VERSIONS.service,   agreed: true },
    { terms_type: "privacy",   terms_version: TERMS_VERSIONS.privacy,   agreed: true },
    { terms_type: "marketing", terms_version: TERMS_VERSIONS.marketing, agreed: input.agreeMarketing },
  ];
  await recordTermsConsentBatch(consentInputs);

  if (result.requiresEmailConfirmation) {
    return { ok: true, requiresEmailConfirmation: true };
  }

  redirect("/");
  return { ok: true, requiresEmailConfirmation: false };
}
