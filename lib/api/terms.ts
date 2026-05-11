import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";
import type {
  TermsConsentInput,
  TermsConsentStatus,
  TermsType,
  UserTermsConsent,
} from "@/lib/types/terms";

/**
 * 현재 로그인 사용자의 최신 약관 동의 상태 조회
 * 각 타입별 가장 최근 행의 agreed 값을 반환
 * 동의 이력이 없는 타입은 false로 처리
 */
export async function getMyTermsConsentStatus(): Promise<
  ApiResult<TermsConsentStatus>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("user_terms_consents")
    .select("terms_type, agreed, consented_at")
    .eq("user_id", user.id)
    .order("consented_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  // 타입별 가장 최신 행만 추출
  const latestByType = new Map<TermsType, boolean>();
  for (const row of (data ?? []) as Pick<
    UserTermsConsent,
    "terms_type" | "agreed" | "consented_at"
  >[]) {
    if (!latestByType.has(row.terms_type as TermsType)) {
      latestByType.set(row.terms_type as TermsType, row.agreed);
    }
  }

  const status: TermsConsentStatus = {
    service:                latestByType.get("service") ?? false,
    privacy:                latestByType.get("privacy") ?? false,
    marketing:              latestByType.get("marketing") ?? false,
    player_registration:    latestByType.get("player_registration") ?? false,
    tournament_notification: latestByType.get("tournament_notification") ?? false,
    basic_info_usage:       latestByType.get("basic_info_usage") ?? false,
  };

  return { data: status, error: null };
}

/**
 * 약관 동의 기록 저장 (단건)
 * 동의/철회 모두 INSERT로 기록 (이력 보존)
 */
export async function recordTermsConsent(
  input: TermsConsentInput
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("user_terms_consents").insert({
    user_id: user.id,
    terms_type: input.terms_type,
    terms_version: input.terms_version,
    agreed: input.agreed,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 복수 약관 동의 일괄 저장 (가입 시 사용)
 * 각 타입은 독립적으로 저장 (트랜잭션 미지원 환경 고려)
 * 하나라도 실패하면 첫 번째 오류를 반환
 */
export async function recordTermsConsentBatch(
  inputs: TermsConsentInput[]
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const rows = inputs.map((input) => ({
    user_id: user.id,
    terms_type: input.terms_type,
    terms_version: input.terms_version,
    agreed: input.agreed,
  }));

  const { error } = await supabase.from("user_terms_consents").insert(rows);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
