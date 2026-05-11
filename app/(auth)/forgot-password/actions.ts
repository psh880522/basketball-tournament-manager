"use server";

import { headers } from "next/headers";
import { resetPasswordForEmail } from "@/lib/api/auth";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

type ForgotPasswordInput = {
  email: string;
};

function translateForgotPasswordError(message: string): string {
  const map: Record<string, string> = {
    "Email rate limit exceeded": "잠시 후 다시 시도해주세요.",
    "Unable to validate email address: invalid format":
      "올바른 이메일 형식을 입력하세요.",
  };
  return map[message] ?? "메일 발송 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult> {
  if (!input.email.trim()) {
    return { ok: false, error: "이메일을 입력하세요." };
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${host}`;
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const result = await resetPasswordForEmail(input.email.trim(), redirectTo);

  if (result.error) {
    return { ok: false, error: translateForgotPasswordError(result.error) };
  }

  return { ok: true };
}
