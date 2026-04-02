"use server";

import { revalidatePath } from "next/cache";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

type UpdateRoleInput = {
  targetUserId: string;
  newRole: "player" | "manager";
};

export async function updateUserRoleAction(
  input: UpdateRoleInput
): Promise<ActionResult> {
  const caller = await getUserWithRole();

  if (caller.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (caller.status === "error" || caller.status === "empty") {
    return { ok: false, error: "인증 오류가 발생했습니다." };
  }
  if (caller.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }
  if (!input.targetUserId) {
    return { ok: false, error: "대상 사용자 ID가 필요합니다." };
  }
  if (input.newRole !== "player" && input.newRole !== "manager") {
    return { ok: false, error: "유효하지 않은 역할입니다." };
  }

  const supabase = await createSupabaseServerClient();

  // SECURITY DEFINER RPC 호출 (DB 레벨에서 organizer 재검증 + organizer 보호)
  const { error } = await supabase.rpc("update_user_role", {
    target_user_id: input.targetUserId,
    new_role: input.newRole,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
