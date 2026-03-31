"use server";

import { redirect } from "next/navigation";
import { getCurrentUserRole, signInWithPassword as signIn } from "@/lib/api/auth";
import { isOperationRole } from "@/src/lib/auth/roles";

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

  const roleResult = await getCurrentUserRole();

  if (roleResult.error) {
    return { ok: false, error: roleResult.error };
  }

  const nextPath = isOperationRole(roleResult.role) ? "/admin" : "/dashboard";
  redirect(nextPath);
  return { ok: true };
}
