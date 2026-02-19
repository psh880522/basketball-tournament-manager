import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type TournamentStatus = "draft" | "open" | "closed" | "finished";

export type TournamentAdminRow = {
  id: string;
  name: string;
  status: TournamentStatus;
};

export type PublicTournamentRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
};

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

const tournamentStatuses: TournamentStatus[] = [
  "draft",
  "open",
  "closed",
  "finished",
];

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

export async function getOpenTournaments(): Promise<
  ApiResult<PublicTournamentRow[]>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<PublicTournamentRow>("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .eq("status", "open")
    .order("start_date", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getPublicTournamentById(
  tournamentId: string
): Promise<ApiResult<PublicTournamentRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<PublicTournamentRow>("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .eq("id", tournamentId)
    .maybeSingle();

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

export async function finishTournament(
  tournamentId: string
): Promise<ApiResult<TournamentAdminRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<TournamentAdminRow>("tournaments")
    .update({ status: "finished" })
    .eq("id", tournamentId)
    .select("id,name,status")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}
