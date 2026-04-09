import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResult, ActionResult } from "@/lib/types/api";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

/**
 * 알림 생성 (best-effort — 에러가 발생해도 throw하지 않음)
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data: data ?? null,
    });
  } catch (err) {
    console.error("[createNotification] 알림 저장 실패:", err);
  }
}

/**
 * 내 알림 목록 조회 (최신순)
 */
export async function listMyNotifications(
  limit = 50
): Promise<ApiResult<NotificationRow[]>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, data, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };

  return { data: (data ?? []) as NotificationRow[], error: null };
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
