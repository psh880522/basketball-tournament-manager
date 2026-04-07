"use server";

import { redirect } from "next/navigation";
import { signUpWithPassword as signUp } from "@/lib/api/auth";

type SignUpActionResult =
  | { ok: true; requiresEmailConfirmation: boolean }
  | { ok: false; error: string };

type SignUpInput = {
  email: string;
  password: string;
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

  const result = await signUp(input.email.trim(), input.password);

  if (result.error) {
    return { ok: false, error: translateSignUpError(result.error) };
  }

  if (result.requiresEmailConfirmation) {
    return { ok: true, requiresEmailConfirmation: true };
  }

  redirect("/");
  return { ok: true, requiresEmailConfirmation: false };
}
