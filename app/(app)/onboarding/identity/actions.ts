"use server";

import { requireIdentityVerification } from "@/src/lib/config/env";
import { mockAdapter } from "@/src/lib/identity/adapter";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";

type VerifyInput = {
  name: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
};

type VerifyResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function verifyIdentityAndPromote(
  input: VerifyInput
): Promise<VerifyResult> {
  const userResult = await getUserWithRole();
  if (userResult.status !== "ready") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  let provider: string;
  let txId: string;
  let rawResponse: unknown;
  let verifiedName: string | null;
  let verifiedPhone: string | null;
  let verifiedBirthDate: string | null;

  if (!requireIdentityVerification) {
    // non-production: mock adapter 사용
    const result = await mockAdapter.verify("", {
      name: input.name,
      phone: input.phone,
      birthDate: input.birthDate,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    provider = result.provider;
    txId = result.txId;
    rawResponse = result.rawResponse;
    verifiedName = result.verifiedName;
    verifiedPhone = result.verifiedPhone;
    verifiedBirthDate = result.verifiedBirthDate;
  } else {
    // production: 실제 provider adapter 사용 (provider 확정 시 adapter 교체)
    return { ok: false, error: "본인인증 provider가 아직 연동되지 않았습니다." };
  }

  // promote_to_player() RPC v3 호출 — 이력 저장 + role 승격 + 확정값 저장 단일 트랜잭션
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("promote_to_player", {
    p_provider: provider,
    p_provider_tx_id: txId,
    p_raw_response: rawResponse as Record<string, unknown> | null,
    p_verified_name: verifiedName,
    p_verified_phone: verifiedPhone,
    p_verified_birth_date: verifiedBirthDate,
  });

  if (error) {
    console.error("[verifyIdentityAndPromote] RPC 오류:", error.message);
    return { ok: false, error: "승격 처리 중 오류가 발생했습니다." };
  }

  return { ok: true, redirectTo: "/onboarding/completion?step=player" };
}
