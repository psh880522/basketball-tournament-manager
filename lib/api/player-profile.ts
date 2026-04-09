import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";
import type {
  PlayerProfile,
  PlayerProfileUpdateInput,
} from "@/lib/types/player";

// 허용된 수정 가능 컬럼 목록 (column-level 보호)
const ALLOWED_UPDATE_COLUMNS = [
  "gender",
  "position",
  "sub_position",
  "height_cm",
  "weight_kg",
  "career_level",
  "region",
  "jersey_number",
  "bio",
] as const;

/**
 * 선수 등록 완료 여부 판단
 * 기준: 5개 필수 항목(gender, position, height_cm, career_level, region) 모두 입력
 * identity 페이지 진입 가드(4차)와 온보딩 완료 판단에서 사용
 */
export function isPlayerRegistrationCompleted(
  playerProfile: PlayerProfile | null
): boolean {
  if (!playerProfile) return false;
  return (
    !!playerProfile.gender &&
    !!playerProfile.position &&
    playerProfile.height_cm != null &&
    !!playerProfile.career_level &&
    !!playerProfile.region?.trim()
  );
}

/**
 * 현재 로그인 사용자의 선수 프로필 조회
 * RLS: 본인만 조회 가능
 * player role 전환 전에는 행이 없으므로 null 반환
 */
export async function getMyPlayerProfile(): Promise<
  ApiResult<PlayerProfile | null>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("player_profiles")
    .select(
      "id, gender, position, sub_position, height_cm, weight_kg, career_level, region, jersey_number, bio, created_at, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as PlayerProfile | null, error: null };
}

/**
 * 특정 사용자의 선수 프로필 조회 (organizer용)
 * RLS: organizer는 전체 조회 가능
 */
export async function getPlayerProfileById(
  userId: string
): Promise<ApiResult<PlayerProfile | null>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("player_profiles")
    .select(
      "id, gender, position, sub_position, height_cm, weight_kg, career_level, region, jersey_number, bio, created_at, updated_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as PlayerProfile | null, error: null };
}

/**
 * 현재 로그인 사용자의 선수 프로필 upsert (온보딩용)
 * 행이 없으면 INSERT, 있으면 UPDATE (INSERT ON CONFLICT DO UPDATE)
 * 허용 컬럼: ALLOWED_UPDATE_COLUMNS에 명시된 필드만
 */
export async function upsertMyPlayerProfile(
  input: PlayerProfileUpdateInput
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const upsertData: Record<string, unknown> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };
  for (const col of ALLOWED_UPDATE_COLUMNS) {
    if (input[col] !== undefined) {
      upsertData[col] = input[col];
    }
  }

  const { error } = await supabase
    .from("player_profiles")
    .upsert(upsertData, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 현재 로그인 사용자의 선수 프로필 수정
 * 허용 컬럼: ALLOWED_UPDATE_COLUMNS에 명시된 필드만 (id, created_at 등 시스템 필드 제외)
 */
export async function updateMyPlayerProfile(
  input: PlayerProfileUpdateInput
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 허용된 컬럼만 추출하여 업데이트 객체 구성
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const col of ALLOWED_UPDATE_COLUMNS) {
    if (input[col] !== undefined) {
      updateData[col] = input[col];
    }
  }

  const { error } = await supabase
    .from("player_profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
