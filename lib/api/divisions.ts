import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export type DivisionRow = {
  id: string;
  tournament_id: string;
  name: string;
  group_size: number | null;
  tournament_size: number | null;
  include_tournament_slots: boolean;
  sort_order: number;
  standings_dirty: boolean;
};

export async function getDivisionsByTournament(
  tournamentId: string
): Promise<ApiResult<DivisionRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("divisions")
    .select(
      "id,tournament_id,name,group_size,tournament_size,include_tournament_slots,sort_order,standings_dirty"
    )
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function setDivisionStandingsDirty(
  divisionId: string,
  dirty: boolean
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("divisions")
    .update({ standings_dirty: dirty })
    .eq("id", divisionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createDivision(
  tournamentId: string,
  input: {
    name: string;
    group_size?: number;
    tournament_size?: number | null;
    include_tournament_slots?: boolean;
  }
): Promise<ActionResult> {
  const groupSize = input.group_size ?? 4;
  if (typeof groupSize !== "number" || groupSize < 2) {
    return { ok: false, error: "그룹 크기는 2 이상이어야 합니다." };
  }

  if (input.tournament_size !== undefined && input.tournament_size !== null) {
    if (!Number.isInteger(input.tournament_size) || input.tournament_size < 2) {
      return { ok: false, error: "토너먼트 크기는 2 이상의 정수여야 합니다." };
    }
  }

  const supabase = await createSupabaseServerClient();

  // 현재 max sort_order 조회
  const { data: existing } = await supabase
    .from("divisions")
    .select("sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("divisions").insert({
    tournament_id: tournamentId,
    name: input.name.trim(),
    group_size: groupSize,
    tournament_size: input.tournament_size ?? null,
    include_tournament_slots: input.include_tournament_slots ?? false,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateDivision(
  divisionId: string,
  input: {
    name?: string;
    group_size?: number;
    tournament_size?: number | null;
    include_tournament_slots?: boolean;
  }
): Promise<ActionResult> {
  if (input.group_size !== undefined && (typeof input.group_size !== "number" || input.group_size < 2)) {
    return { ok: false, error: "그룹 크기는 2 이상이어야 합니다." };
  }

  if (input.tournament_size !== undefined && input.tournament_size !== null) {
    if (!Number.isInteger(input.tournament_size) || input.tournament_size < 2) {
      return { ok: false, error: "토너먼트 크기는 2 이상의 정수여야 합니다." };
    }
  }

  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.group_size !== undefined) payload.group_size = input.group_size;
  if (input.tournament_size !== undefined) {
    payload.tournament_size = input.tournament_size;
  }
  if (input.include_tournament_slots !== undefined) {
    payload.include_tournament_slots = input.include_tournament_slots;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("divisions")
    .update(payload)
    .eq("id", divisionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateDivisionConfig(
  divisionId: string,
  input: {
    group_size?: number;
    tournament_size?: number | null;
    include_tournament_slots?: boolean;
  }
): Promise<ActionResult> {
  return updateDivision(divisionId, input);
}

/* ── 디비전 + 통계 조회 (bracket console 용) ── */

export type DivisionWithStats = {
  id: string;
  tournament_id: string;
  name: string;
  group_size: number;
  sort_order: number;
  approvedCount: number;
  matchCount: number;
};

export async function listDivisionsWithStats(
  tournamentId: string
): Promise<ApiResult<DivisionWithStats[]>> {
  const supabase = await createSupabaseServerClient();

  const { data: divisions, error: divError } = await supabase
    .from("divisions")
    .select("id,tournament_id,name,group_size,sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (divError) return { data: null, error: divError.message };
  if (!divisions || divisions.length === 0) return { data: [], error: null };

  const result: DivisionWithStats[] = await Promise.all(
    divisions.map(async (d) => {
      const [appRes, matchRes] = await Promise.all([
        supabase
          .from("tournament_team_applications")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", tournamentId)
          .eq("division_id", d.id)
          .eq("status", "approved"),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("division_id", d.id),
      ]);

      return {
        id: d.id,
        tournament_id: d.tournament_id,
        name: d.name,
        group_size: d.group_size ?? 4,
        sort_order: d.sort_order ?? 0,
        approvedCount: appRes.count ?? 0,
        matchCount: matchRes.count ?? 0,
      };
    })
  );

  return { data: result, error: null };
}

export async function deleteDivision(
  divisionId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  // 사용 중인 application 확인
  const { count, error: countErr } = await supabase
    .from("tournament_team_applications")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId);

  if (countErr) return { ok: false, error: countErr.message };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "이 division을 사용하는 신청이 존재하여 삭제할 수 없습니다.",
    };
  }

  const { error } = await supabase
    .from("divisions")
    .delete()
    .eq("id", divisionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
