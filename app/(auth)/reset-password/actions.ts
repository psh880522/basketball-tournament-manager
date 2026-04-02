"use server";

import { redirect } from "next/navigation";
import { updateUserPassword } from "@/lib/api/auth";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

type ResetPasswordInput = {
  password: string;
};

function translateResetPasswordError(message: string): string {
  const map: Record<string, string> = {
    "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
    "Auth session missing!":
      "재설정 링크가 만료되었거나 유효하지 않습니다. 다시 시도해주세요.",
    "New password should be different from the old password":
      "새 비밀번호는 기존 비밀번호와 달라야 합니다.",
  };
  return map[message] ?? "비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  if (!input.password.trim()) {
    return { ok: false, error: "새 비밀번호를 입력하세요." };
  }

  if (input.password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const result = await updateUserPassword(input.password);

  if (result.error) {
    return { ok: false, error: translateResetPasswordError(result.error) };
  }

  redirect("/dashboard");
  return { ok: true };
}
