"use server";

import { requireIdentityVerification } from "@/src/lib/config/env";
import { mockAdapter } from "@/src/lib/identity/adapter";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ActionResult } from "@/lib/types/api";

export async function verifyIdentityAndPromote(
  token: string
): Promise<ActionResult> {
  let provider: string;
  let txId: string;
  let rawResponse: unknown;

  if (!requireIdentityVerification) {
    // non-production: mock adapter 사용, 실제 API 호출 스킵
    const result = await mockAdapter.verify(token);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    provider = result.provider;
    txId = result.txId;
    rawResponse = result.rawResponse;
  } else {
    // production: 실제 provider adapter 사용 (provider 확정 시 adapter 교체)
    // const result = await realAdapter.verify(token);
    // if (!result.ok) return { ok: false, error: result.error };
    // provider = result.provider; txId = result.txId; rawResponse = result.rawResponse;
    return { ok: false, error: "본인인증 provider가 아직 연동되지 않았습니다." };
  }

  // promote_to_player() RPC 호출 — 이력 저장 + role 승격 단일 트랜잭션
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("promote_to_player", {
    p_provider: provider,
    p_provider_tx_id: txId,
    p_raw_response: rawResponse as Record<string, unknown> | null,
  });

  if (error) {
    return { ok: false, error: "승격 처리 중 오류가 발생했습니다." };
  }

  return { ok: true };
}
