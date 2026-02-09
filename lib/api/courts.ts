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
    .from<Court>("courts")
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
    .from<Court>("courts")
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
    .from<Court>("courts")
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
    .from<Court>("courts")
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
    .from<Court>("courts")
    .delete()
    .eq("id", courtId)
    .select("id")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}
