import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type Court = {
  id: string;
  tournament_id: string;
  name: string;
  display_order: number | null;
};

export async function getCourtsByTournament(
  tournamentId: string
): Promise<ApiResult<Court[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courts")
    .select("id,tournament_id,name,display_order")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function findCourtByName(
  tournamentId: string,
  name: string
): Promise<ApiResult<Pick<Court, "id" | "name">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courts")
    .select("id,name")
    .eq("tournament_id", tournamentId)
    .eq("name", name)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getCourtById(
  courtId: string
): Promise<ApiResult<Pick<Court, "id" | "tournament_id" | "name">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courts")
    .select("id,tournament_id,name")
    .eq("id", courtId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function createCourt(
  tournamentId: string,
  name: string
): Promise<ApiResult<Court>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courts")
    .insert({
      tournament_id: tournamentId,
      name,
    })
    .select("id,tournament_id,name,display_order")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function deleteCourt(
  courtId: string
): Promise<ApiResult<Pick<Court, "id">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courts")
    .delete()
    .eq("id", courtId)
    .select("id")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}

/* ?占?占?占?ActionResult-based helpers for edit page ?占?占?占?*/

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCourtForTournament(
  tournamentId: string,
  input: { name: string }
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  // ?占쎌옱 max display_order 議고쉶
  const { data: existing } = await supabase
    .from("courts")
    .select("display_order")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((existing?.display_order as number | null) ?? -1) + 1;

  const { error } = await supabase.from("courts").insert({
    tournament_id: tournamentId,
    name: input.name.trim(),
    display_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateCourtForTournament(
  courtId: string,
  input: { name?: string; display_order?: number }
): Promise<ActionResult> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.display_order !== undefined) payload.display_order = input.display_order;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("courts")
    .update(payload)
    .eq("id", courtId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCourtSafe(
  courtId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  // 寃쎄린??諛곗젙??肄뷀듃?占쏙옙? ?占쎌씤
  const { count, error: countErr } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("court_id", courtId);

  if (countErr) return { ok: false, error: countErr.message };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "??肄뷀듃??諛곗젙??寃쎄린媛 ?占쎌뼱 ??占쏙옙?????占쎌뒿?占쎈떎.",
    };
  }

  const { error } = await supabase
    .from("courts")
    .delete()
    .eq("id", courtId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
