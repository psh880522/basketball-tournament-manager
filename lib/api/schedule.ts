import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/* ─── Schedule match row (for schedule page) ─── */

export type ScheduleMatchRow = {
  id: string;
  tournament_id: string;
  division_id: string;
  group_id: string | null;
  team_a_id: string;
  team_b_id: string;
  court_id: string | null;
  scheduled_at: string | null;
  status: string;
  divisions: { name: string } | null;
  groups: { name: string; order: number } | null;
  team_a: { id: string; team_name: string } | null;
  team_b: { id: string; team_name: string } | null;
  court: { id: string; name: string } | null;
};

export type ScheduleSlotReadRow = {
  id: string;
  slot_type: string;
  stage_type: string | null;
  start_at: string | null;
  end_at: string | null;
  court_id: string | null;
  division_id: string | null;
  match_id: string | null;
  label: string | null;
  sort_order: number;
};

export async function getScheduleMatches(
  tournamentId: string,
  filters?: { divisionId?: string; courtId?: string }
): Promise<{ data: ScheduleMatchRow[] | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("matches")
    .select(
      "id,tournament_id,division_id,group_id,team_a_id,team_b_id,court_id,scheduled_at,status,divisions(name),groups(name,order),team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name),court:courts(id,name)"
    )
    .eq("tournament_id", tournamentId)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (filters?.divisionId) {
    query = query.eq("division_id", filters.divisionId);
  }
  if (filters?.courtId) {
    query = query.eq("court_id", filters.courtId);
  }

  const { data, error } = await query;

  return {
    data: data as ScheduleMatchRow[] | null,
    error: error ? error.message : null,
  };
}

/* ─── Auto-generate schedule ─── */

export async function generateSchedule(input: {
  tournamentId: string;
  startAt: string; // ISO datetime
  intervalMinutes: number;
}): Promise<ActionResult> {
  const { tournamentId, startAt, intervalMinutes } = input;

  if (intervalMinutes < 1) {
    return { ok: false, error: "경기 간격은 1분 이상이어야 합니다." };
  }

  const supabase = await createSupabaseServerClient();

  // 1) Fetch courts (sort by display_order)
  const { data: courts, error: courtsErr } = await supabase
    .from("courts")
    .select("id,name,display_order")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (courtsErr) return { ok: false, error: courtsErr.message };
  if (!courts || courts.length === 0) {
    return { ok: false, error: "코트를 먼저 추가하세요." };
  }

  // 2) Fetch divisions (sort by sort_order)
  const { data: divisions, error: divsErr } = await supabase
    .from("divisions")
    .select("id,name,sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (divsErr) return { ok: false, error: divsErr.message };
  if (!divisions || divisions.length === 0) {
    return { ok: false, error: "Division을 먼저 추가하세요." };
  }

  // 3) Fetch all matches for tournament, ordered by division
  const { data: allMatches, error: matchErr } = await supabase
    .from("matches")
    .select("id,division_id,group_id,created_at")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (matchErr) return { ok: false, error: matchErr.message };
  if (!allMatches || allMatches.length === 0) {
    return { ok: false, error: "먼저 조/경기 생성을 완료하세요." };
  }

  // 4) Group matches by division and sort within
  const divisionOrder = new Map(divisions.map((d, i) => [d.id, i]));
  const sortedMatches = [...allMatches].sort((a, b) => {
    const da = divisionOrder.get(a.division_id) ?? 999;
    const db = divisionOrder.get(b.division_id) ?? 999;
    if (da !== db) return da - db;
    // Within division: group_id then created_at
    const ga = a.group_id ?? "";
    const gb = b.group_id ?? "";
    if (ga !== gb) return ga.localeCompare(gb);
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  // 5) Assign scheduled_at + court_id using block placement
  const baseTime = new Date(startAt).getTime();
  const intervalMs = intervalMinutes * 60 * 1000;
  const courtCount = courts.length;

  const updates = sortedMatches.map((match, i) => {
    const courtIndex = i % courtCount;
    const timeSlot = Math.floor(i / courtCount);
    const scheduledAt = new Date(baseTime + timeSlot * intervalMs).toISOString();
    return {
      id: match.id,
      court_id: courts[courtIndex].id,
      scheduled_at: scheduledAt,
    };
  });

  // 6) Batch update (individual updates for safety)
  for (const u of updates) {
    const { error } = await supabase
      .from("matches")
      .update({ court_id: u.court_id, scheduled_at: u.scheduled_at })
      .eq("id", u.id);

    if (error) {
      return { ok: false, error: `경기 ${u.id} 업데이트 실패: ${error.message}` };
    }
  }

  return { ok: true };
}

/* ─── Bulk save: update match schedule assignments (reorder + court changes) ─── */

export async function bulkSaveSchedule(input: {
  tournamentId: string;
  updates: { matchId: string; scheduledAt: string | null; courtId: string | null }[];
}): Promise<ActionResult> {
  const { tournamentId, updates } = input;

  if (updates.length === 0) {
    return { ok: false, error: "변경사항이 없습니다." };
  }

  const supabase = await createSupabaseServerClient();

  // Validate all matches belong to this tournament
  const matchIds = updates.map((u) => u.matchId);
  const { data: existing, error: fetchErr } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .in("id", matchIds);

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!existing || existing.length !== new Set(matchIds).size) {
    return { ok: false, error: "일부 경기가 이 대회에 속하지 않습니다." };
  }

  // Update each match
  for (const u of updates) {
    const { error } = await supabase
      .from("matches")
      .update({ scheduled_at: u.scheduledAt, court_id: u.courtId })
      .eq("id", u.matchId);

    if (error) {
      return { ok: false, error: `경기 업데이트 실패: ${error.message}` };
    }
  }

  return { ok: true };
}
