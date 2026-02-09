import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string | null;
};

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export async function getPlayersByTeam(
  teamId: string
): Promise<ApiResult<Player[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Player>("players")
    .select("id,team_id,name,number,position")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getPlayerById(
  playerId: string
): Promise<ApiResult<Player>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Player>("players")
    .select("id,team_id,name,number,position")
    .eq("id", playerId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function createPlayer(
  teamId: string,
  input: Omit<Player, "id" | "team_id">
): Promise<ApiResult<Player>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Player>("players")
    .insert({
      team_id: teamId,
      name: input.name,
      number: input.number,
      position: input.position,
    })
    .select("id,team_id,name,number,position")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function updatePlayer(
  playerId: string,
  input: Omit<Player, "id" | "team_id">
): Promise<ApiResult<Player>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Player>("players")
    .update({
      name: input.name,
      number: input.number,
      position: input.position,
    })
    .eq("id", playerId)
    .select("id,team_id,name,number,position")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function deletePlayer(
  playerId: string
): Promise<ApiResult<Pick<Player, "id">>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Player>("players")
    .delete()
    .eq("id", playerId)
    .select("id")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}
