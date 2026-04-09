import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Role } from "@/src/lib/auth/roles";
import type { ApiResult, ActionResult } from "@/lib/types/api";

// ── 타입 정의 ──────────────────────────────────────────────────────────────

/** profiles 테이블에서 읽어오는 전체 프로필 구조 */
export type Profile = {
  id: string;
  role: Role;
  display_name: string | null;
  /** @deprecated 본인인증 확정값은 verified_phone 사용 */
  phone: string | null;
  /** @deprecated 본인인증 확정값은 verified_birth_date 사용 */
  birth_date: string | null; // ISO 8601 date string (YYYY-MM-DD)
  identity_verified_at: string | null;
  verified_name: string | null;        // 본인인증 확정 실명
  verified_phone: string | null;       // 본인인증 확정 휴대폰
  verified_birth_date: string | null;  // 본인인증 확정 생년월일 (YYYY-MM-DD)
  created_at: string;
};

/** 사용자가 업데이트 가능한 필드만 포함 (role, verified_*, created_at 등 시스템 필드 제외) */
export type ProfileUpdateInput = {
  display_name?: string;
};

// ── API 함수 ───────────────────────────────────────────────────────────────

/**
 * 현재 로그인 사용자의 전체 프로필 조회
 * RLS: 본인만 조회 가능
 */
export async function getMyProfile(): Promise<ApiResult<Profile>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, display_name, phone, birth_date, identity_verified_at, verified_name, verified_phone, verified_birth_date, created_at"
    )
    .eq("id", user.id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile, error: null };
}

/**
 * 특정 사용자의 프로필 조회
 * RLS: organizer는 전체 조회 가능, 일반 사용자는 본인만 조회 가능
 */
export async function getProfileById(
  userId: string
): Promise<ApiResult<Profile | null>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, display_name, phone, birth_date, identity_verified_at, verified_name, verified_phone, verified_birth_date, created_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile | null, error: null };
}

/**
 * 현재 로그인 사용자의 프로필 수정
 * 허용 컬럼: display_name
 * role, verified_*, phone, birth_date, created_at 등 시스템 필드는 이 함수를 통해 수정 불가
 */
export async function updateMyProfile(
  input: ProfileUpdateInput
): Promise<ActionResult> {
  const display_name = input.display_name?.trim() || null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── 헬퍼 함수 ──────────────────────────────────────────────────────────────

/**
 * 프로필 완료 여부 판단
 * 기준: display_name이 채워져 있으면 완료
 * phone, birth_date는 본인인증 단계 확정값으로 이동 (프로필 완료 조건에서 제외)
 */
export function isProfileCompleted(profile: Profile | null): boolean {
  if (!profile) return false;
  return !!profile.display_name?.trim();
}
