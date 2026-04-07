import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Role } from "@/src/lib/auth/roles";
import type { ApiResult, ActionResult } from "@/lib/types/api";

// ── 타입 정의 ──────────────────────────────────────────────────────────────

/** profiles 테이블에서 읽어오는 전체 프로필 구조 */
export type Profile = {
  id: string;
  role: Role;
  display_name: string | null;
  phone: string | null;
  birth_date: string | null; // ISO 8601 date string (YYYY-MM-DD)
  created_at: string;
};

/** 사용자가 업데이트 가능한 필드만 포함 (role, created_at 등 시스템 필드 제외) */
export type ProfileUpdateInput = {
  display_name?: string;
  phone?: string;
  birth_date?: string; // YYYY-MM-DD
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
    .select("id, role, display_name, phone, birth_date, created_at")
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
    .select("id, role, display_name, phone, birth_date, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile | null, error: null };
}

/**
 * 현재 로그인 사용자의 프로필 수정
 * 허용 컬럼: display_name, phone, birth_date
 * role, created_at 등 시스템 필드는 이 함수를 통해 수정 불가
 */
export async function updateMyProfile(
  input: ProfileUpdateInput
): Promise<ActionResult> {
  const display_name = input.display_name?.trim() || null;
  const phone = input.phone?.trim() || null;
  const birth_date = input.birth_date?.trim() || null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, phone, birth_date })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── 헬퍼 함수 ──────────────────────────────────────────────────────────────

/**
 * 프로필 완료 여부 판단
 * 기준: display_name과 phone이 모두 채워져 있으면 완료
 * birth_date는 선택 항목 (향후 본인인증 시 필수화 가능)
 */
export function isProfileCompleted(profile: Profile | null): boolean {
  if (!profile) return false;
  return !!profile.display_name?.trim() && !!profile.phone?.trim();
}
