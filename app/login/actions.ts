"use server";

import { signInWithPassword as signIn } from "@/lib/api/auth";

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

export async function signInWithPassword(
  input: SignInInput
): Promise<ActionResult> {
  if (!input.email.trim() || !input.password.trim()) {
    return { ok: false, error: "Email과 비밀번호를 입력하세요." };
  }

  const result = await signIn(input.email.trim(), input.password);

  if (result.error) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
