"use server";

import { redirect } from "next/navigation";
import { getCurrentUserRole, signInWithPassword as signIn } from "@/lib/api/auth";
import { isOperationRole, isPlayerRole } from "@/src/lib/auth/roles";

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type SignInInput = {
  email: string;
  password: string;
};

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "Email not confirmed": "이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.",
    "Too many requests": "잠시 후 다시 시도해주세요.",
    "User not found": "이메일 또는 비밀번호가 올바르지 않습니다.",
  };
  return map[message] ?? "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export async function signInWithPassword(
  input: SignInInput
): Promise<ActionResult> {
  if (!input.email.trim() || !input.password.trim()) {
    return { ok: false, error: "이메일과 비밀번호를 입력하세요." };
  }

  const result = await signIn(input.email.trim(), input.password);

  if (result.error) {
    return { ok: false, error: translateAuthError(result.error) };
  }

  const roleResult = await getCurrentUserRole();

  if (roleResult.error) {
    return { ok: false, error: "사용자 정보를 불러오지 못했습니다." };
  }

  if (isOperationRole(roleResult.role)) {
    redirect("/admin");
  }

  if (isPlayerRole(roleResult.role)) {
    redirect("/dashboard");
  }

  // user role: 랜딩으로 이동 (선수 등록 CTA)
  redirect("/");
}
