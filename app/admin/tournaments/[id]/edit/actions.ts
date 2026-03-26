"use server";

import {
  updateTournament,
} from "@/lib/api/tournaments";
import {
  createDivision,
  updateDivisionConfig,
  deleteDivision,
} from "@/lib/api/divisions";
import {
  createCourtForTournament,
  updateCourtForTournament,
  deleteCourtSafe,
} from "@/lib/api/courts";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

type UpdateTournamentInput = {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;
};

type ActionResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

export async function updateTournamentAction(
  input: UpdateTournamentInput
): Promise<ActionResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "대회 정보가 없습니다." };
  }

  return updateTournament(input.tournamentId, {
    name: input.name,
    location: input.location,
    start_date: input.start_date,
    end_date: input.end_date,
    max_teams: input.max_teams,
    schedule_start_at: input.schedule_start_at,
    description: input.description,
  });
}

export async function updateMaxTeamsAction(
  tournamentId: string,
  maxTeams: number | null
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ max_teams: maxTeams })
    .eq("id", tournamentId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  return { ok: true };
}

export async function uploadPosterAction(
  tournamentId: string,
  formData: FormData
): Promise<{ ok: true; posterUrl: string } | { ok: false; error: string }> {
  const file = formData.get("poster") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "파일을 선택해 주세요." };
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "파일 크기는 5MB 이하여야 합니다." };
  }

  const supabase = await createSupabaseServerClient();

  // Verify auth state before upload
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: `인증 오류: ${authError?.message ?? "사용자를 찾을 수 없습니다. 다시 로그인해 주세요."}` };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${tournamentId}/poster.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("tournament-posters")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return { ok: false, error: `[uid:${user.id.slice(0, 8)}] ${uploadError.message}` };

  const { data: urlData } = supabase.storage
    .from("tournament-posters")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({ poster_url: urlData.publicUrl })
    .eq("id", tournamentId);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  return { ok: true, posterUrl: urlData.publicUrl };
}

export async function deletePosterAction(
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("tournaments")
    .select("poster_url")
    .eq("id", tournamentId)
    .maybeSingle();

  if (row?.poster_url) {
    const url = new URL(row.poster_url);
    const storagePath = url.pathname.split("/tournament-posters/")[1];
    if (storagePath) {
      await supabase.storage.from("tournament-posters").remove([storagePath]);
    }
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ poster_url: null })
    .eq("id", tournamentId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  return { ok: true };
}

export async function createDivisionAction(
  tournamentId: string,
  name: string,
  groupSize?: number,
  tournamentSize?: number | null
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "Division 이름을 입력하세요." };

  const result = await createDivision(tournamentId, {
    name,
    ...(groupSize !== undefined ? { group_size: groupSize } : {}),
    ...(tournamentSize !== undefined ? { tournament_size: tournamentSize } : {}),
  });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function updateDivisionAction(
  tournamentId: string,
  divisionId: string,
  name: string,
  groupSize?: number,
  tournamentSize?: number | null
): Promise<ActionResult> {
  if (!divisionId) return { ok: false, error: "Division 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "Division 이름을 입력하세요." };

  const result = await updateDivisionConfig(divisionId, {
    name,
    ...(groupSize !== undefined ? { group_size: groupSize } : {}),
    ...(tournamentSize !== undefined ? { tournament_size: tournamentSize } : {}),
  });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function deleteDivisionAction(
  tournamentId: string,
  divisionId: string
): Promise<ActionResult> {
  if (!divisionId) return { ok: false, error: "Division 정보가 없습니다." };

  const result = await deleteDivision(divisionId);
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

/* ─── Court actions ─── */

export async function createCourtAction(
  tournamentId: string,
  name: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "코트 이름을 입력하세요." };

  const result = await createCourtForTournament(tournamentId, { name });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function updateCourtAction(
  tournamentId: string,
  courtId: string,
  name: string,
  displayOrder?: number
): Promise<ActionResult> {
  if (!courtId) return { ok: false, error: "코트 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "코트 이름을 입력하세요." };

  const result = await updateCourtForTournament(courtId, {
    name,
    ...(displayOrder !== undefined ? { display_order: displayOrder } : {}),
  });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function deleteCourtAction(
  tournamentId: string,
  courtId: string
): Promise<ActionResult> {
  if (!courtId) return { ok: false, error: "코트 정보가 없습니다." };

  const result = await deleteCourtSafe(courtId);
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}
