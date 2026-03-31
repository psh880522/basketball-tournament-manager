import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Role } from "@/src/lib/auth/roles";

export type UserProfileRow = {
  id: string;
  email: string;
  role: Role;
  created_at: string;
};

/**
 * 전체 사용자 목록 조회 (organizer 전용)
 * user_profiles View를 통해 auth.users.email + profiles.role 함께 조회.
 * security_invoker=true로 RLS(profiles_select_own_or_organizer)가 적용됨.
 */
export async function listUsersWithRole(): Promise<{
  data: UserProfileRow[] | null;
  error: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, role, email, created_at")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfileRow[], error: null };
}
