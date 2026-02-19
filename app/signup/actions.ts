"use server";

import { signUpWithPassword as signUp } from "@/lib/api/auth";

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type SignUpInput = {
  email: string;
  password: string;
};

export async function signUpWithPassword(
  input: SignUpInput
): Promise<ActionResult> {
  if (!input.email.trim() || !input.password.trim()) {
    return { ok: false, error: "Email과 비밀번호를 입력하세요." };
  }

  const result = await signUp(input.email.trim(), input.password);

  if (result.error) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
