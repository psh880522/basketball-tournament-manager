import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type DivisionRow = {
  id: string;
  tournament_id: string;
  name: string;
  group_size: number | null;
};

export async function getDivisionsByTournament(
  tournamentId: string
): Promise<ApiResult<DivisionRow[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<DivisionRow>("divisions")
    .select("id,tournament_id,name,group_size")
    .eq("tournament_id", tournamentId)
    .order("name", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}
