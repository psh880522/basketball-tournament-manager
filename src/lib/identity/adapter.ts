/** 본인인증 provider 추상화 인터페이스 + mock 구현 */

/** mock 환경에서 직접 입력받는 확정값 필드 */
export type VerifyFields = {
  name?: string;
  phone?: string;
  birthDate?: string; // YYYY-MM-DD
};

export type IdentityVerificationResult =
  | {
      ok: true;
      provider: string;
      txId: string;
      rawResponse: unknown;
      verifiedName: string | null;      // 실명 확정값
      verifiedPhone: string | null;     // 휴대폰 확정값
      verifiedBirthDate: string | null; // 생년월일 확정값 (YYYY-MM-DD)
    }
  | { ok: false; error: string };

export interface IdentityVerificationAdapter {
  verify(token: string, fields?: VerifyFields): Promise<IdentityVerificationResult>;
}

/** Non-production 전용 mock 구현 — 실제 API 호출 없이 항상 성공 반환 */
export const mockAdapter: IdentityVerificationAdapter = {
  async verify(
    _token: string,
    fields?: VerifyFields
  ): Promise<IdentityVerificationResult> {
    return {
      ok: true,
      provider: "mock",
      txId: `mock-${Date.now()}`,
      rawResponse: null,
      verifiedName: fields?.name ?? null,
      verifiedPhone: fields?.phone ?? null,
      verifiedBirthDate: fields?.birthDate ?? null,
    };
  },
};

// production provider 구현 자리
// provider 확정 시 여기에 추가 후 actions.ts에서 교체
// export const passAdapter: IdentityVerificationAdapter = { ... };
