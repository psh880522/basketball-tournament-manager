"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createTournamentAction(
  formData: FormData
): Promise<CreateResult> {
  // 1. 권한 체크
  const userResult = await getUserWithRole();
  if (userResult.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (userResult.status !== "ready" || userResult.role !== "organizer" || !userResult.user) {
    return { ok: false, error: "권한이 없습니다." };
  }

  // 2. 필드 추출
  const name = (formData.get("name") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || null;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;
  const timeValue = formData.get("start_time") as string; // "HH:mm"
  const description = (formData.get("description") as string)?.trim() || null;
  const max_teams_raw = formData.get("max_teams") as string;
  const posterFile = formData.get("poster") as File | null;
  const divisionsRaw = formData.get("divisions") as string;
  const courtsRaw = formData.get("courts") as string;

  // 3. 유효성 검사
  if (!name) return { ok: false, error: "대회명은 필수입니다." };
  if (!start_date) return { ok: false, error: "시작일은 필수입니다." };
  if (!end_date) return { ok: false, error: "종료일은 필수입니다." };

  // 4. schedule_start_at 계산 (KST 기준)
  let schedule_start_at: string | null = null;
  if (timeValue) {
    const combined = new Date(`${start_date}T${timeValue}:00+09:00`);
    if (!isNaN(combined.getTime())) {
      schedule_start_at = combined.toISOString();
    }
  }

  // 5. max_teams 파싱
  const max_teams = max_teams_raw ? Number(max_teams_raw) : null;
  if (max_teams !== null && (!Number.isInteger(max_teams) || max_teams < 2)) {
    return { ok: false, error: "최대 팀 수는 2 이상의 정수여야 합니다." };
  }

  // 6. divisions/courts JSON 파싱
  type DivisionPayload = {
    name: string;
    group_size: number;
    tournament_size: number | null;
  };
  type CourtPayload = { name: string };
  const divisions: DivisionPayload[] = divisionsRaw
    ? (JSON.parse(divisionsRaw) as DivisionPayload[])
    : [];
  const courts: CourtPayload[] = courtsRaw
    ? (JSON.parse(courtsRaw) as CourtPayload[])
    : [];

  const supabase = await createSupabaseServerClient();

  // 7. tournament INSERT
  const { data: tournament, error: insertError } = await supabase
    .from("tournaments")
    .insert({
      name,
      location,
      start_date,
      end_date,
      max_teams,
      description,
      schedule_start_at,
      status: "draft",
      created_by: userResult.user.id,
    })
    .select("id")
    .single();

  if (insertError || !tournament) {
    return {
      ok: false,
      error: insertError?.message ?? "대회 생성에 실패했습니다.",
    };
  }

  const tournamentId = tournament.id as string;

  // 8. divisions INSERT
  for (let i = 0; i < divisions.length; i++) {
    const div = divisions[i];
    await supabase.from("divisions").insert({
      tournament_id: tournamentId,
      name: div.name,
      group_size: div.group_size ?? 4,
      tournament_size: div.tournament_size ?? null,
      sort_order: i,
    });
  }

  // 9. courts INSERT
  for (let i = 0; i < courts.length; i++) {
    await supabase.from("courts").insert({
      tournament_id: tournamentId,
      name: courts[i].name,
      display_order: i,
    });
  }

  // 10. 포스터 업로드 (선택, 실패해도 생성 성공 처리)
  if (posterFile && posterFile.size > 0) {
    const ext = posterFile.name.split(".").pop() ?? "jpg";
    const path = `${tournamentId}/poster.${ext}`;
    const buffer = new Uint8Array(await posterFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("tournament-posters")
      .upload(path, buffer, { contentType: posterFile.type, upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("tournament-posters")
        .getPublicUrl(path);

      await supabase
        .from("tournaments")
        .update({ poster_url: urlData.publicUrl })
        .eq("id", tournamentId);
    }
  }

  revalidatePath("/admin");
  return { ok: true, id: tournamentId };
}
