import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type TournamentStatus = "draft" | "open" | "closed";

export type TournamentAdminRow = {
  id: string;
  name: string;
  status: TournamentStatus;
};

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

const tournamentStatuses: TournamentStatus[] = ["draft", "open", "closed"];

export function isTournamentStatus(value: string): value is TournamentStatus {
  return (tournamentStatuses as string[]).includes(value);
}

export function getTournamentStatuses(): TournamentStatus[] {
  return [...tournamentStatuses];
}

export async function getAdminTournaments(): Promise<
  ApiResult<TournamentAdminRow[]>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TournamentAdminRow>("tournaments")
    .select("id,name,status")
    .order("name", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: TournamentStatus
): Promise<ApiResult<TournamentAdminRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TournamentAdminRow>("tournaments")
    .update({ status })
    .eq("id", tournamentId)
    .select("id,name,status")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}
