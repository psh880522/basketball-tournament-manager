/** 본인인증 provider 추상화 인터페이스 + mock 구현 */

export type IdentityVerificationResult =
  | { ok: true; provider: string; txId: string; rawResponse: unknown }
  | { ok: false; error: string };

export interface IdentityVerificationAdapter {
  verify(token: string): Promise<IdentityVerificationResult>;
}

/** Non-production 전용 mock 구현 — 실제 API 호출 없이 항상 성공 반환 */
export const mockAdapter: IdentityVerificationAdapter = {
  async verify(_token: string): Promise<IdentityVerificationResult> {
    return {
      ok: true,
      provider: "mock",
      txId: `mock-${Date.now()}`,
      rawResponse: null,
    };
  },
};

// production provider 구현 자리
// provider 확정 시 여기에 추가 후 actions.ts에서 교체
// export const passAdapter: IdentityVerificationAdapter = { ... };
