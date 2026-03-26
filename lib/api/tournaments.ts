import { getUserWithRole } from "@/src/lib/auth/roles";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type TournamentStatus = "draft" | "open" | "closed" | "finished";

export type TournamentAdminRow = {
  id: string;
  name: string;
  status: TournamentStatus;
};

export type AdminTournamentListRow = {
  id: string;
  name: string;
  status: TournamentStatus;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  deleted_at: string | null;
};

export type TournamentEditRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;
  poster_url: string | null;
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

type ActionResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

type TournamentUpdatePayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;
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
    .from("tournaments")
    .select("id,name,status")
    .order("name", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

const adminStatusOrder: Record<TournamentStatus, number> = {
  open: 0,
  closed: 1,
  draft: 2,
  finished: 3,
};

function sortAdminTournaments(
  tournaments: AdminTournamentListRow[]
): AdminTournamentListRow[] {
  return [...tournaments].sort((left, right) => {
    const statusDelta =
      adminStatusOrder[left.status] - adminStatusOrder[right.status];

    if (statusDelta !== 0) return statusDelta;

    const leftDate = left.start_date
      ? Date.parse(left.start_date)
      : Number.MAX_SAFE_INTEGER;
    const rightDate = right.start_date
      ? Date.parse(right.start_date)
      : Number.MAX_SAFE_INTEGER;

    if (leftDate !== rightDate) return leftDate - rightDate;

    return left.name.localeCompare(right.name);
  });
}

export async function listAdminTournaments(options: {
  includeDeleted: boolean;
}): Promise<ApiResult<AdminTournamentListRow[]>> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("tournaments")
    .select("id,name,status,location,start_date,end_date,deleted_at")
    .order("start_date", { ascending: true, nullsFirst: false });

  if (!options.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: sortAdminTournaments(data ?? []), error: null };
}

export async function getTournamentForEdit(
  tournamentId: string
): Promise<ApiResult<TournamentEditRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at,description,poster_url")
    .eq("id", tournamentId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

async function ensureOrganizer(): Promise<ActionResult> {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (result.status === "error") {
    return {
      ok: false,
      error: result.error ?? "사용자 정보를 불러오지 못했습니다.",
    };
  }

  if (result.status === "empty") {
    return { ok: false, error: "프로필이 없습니다." };
  }

  if (result.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }

  return { ok: true };
}

export async function softDeleteTournament(
  tournamentId: string
): Promise<ActionResult> {
  const authResult = await ensureOrganizer();

  if (!authResult.ok) return authResult;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", tournamentId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function restoreTournament(
  tournamentId: string
): Promise<ActionResult> {
  const authResult = await ensureOrganizer();

  if (!authResult.ok) return authResult;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ deleted_at: null })
    .eq("id", tournamentId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateTournament(
  tournamentId: string,
  payload: TournamentUpdatePayload
): Promise<ActionResult> {
  const authResult = await ensureOrganizer();

  if (!authResult.ok) return authResult;

  if (!payload.name.trim()) {
    return { ok: false, error: "대회명은 필수입니다." };
  }

  if (!payload.start_date || !payload.end_date) {
    return { ok: false, error: "시작일과 종료일을 입력해 주세요." };
  }

  if (payload.max_teams !== null) {
    if (!Number.isInteger(payload.max_teams) || payload.max_teams < 2) {
      return { ok: false, error: "최대 팀 수는 2 이상의 정수여야 합니다." };
    }
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("tournaments")
    .update({
      name: payload.name,
      location: payload.location,
      start_date: payload.start_date,
      end_date: payload.end_date,
      max_teams: payload.max_teams,
      schedule_start_at: payload.schedule_start_at,
      description: payload.description,
    })
    .eq("id", tournamentId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateTournamentPosterUrl(
  tournamentId: string,
  posterUrl: string | null
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ poster_url: posterUrl })
    .eq("id", tournamentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function changeTournamentStatus(
  tournamentId: string,
  nextStatus: TournamentStatus
): Promise<ActionResult> {
  const authResult = await ensureOrganizer();

  if (!authResult.ok) return authResult;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "?占?占쏙옙? 李얠쓣 ???占쎌뒿?占쎈떎." };
  }

  const currentStatus = data.status;

  if (currentStatus === "finished") {
    return { ok: false, error: "醫낅즺???占?占쎈뒗 蹂寃쏀븷 ???占쎌뒿?占쎈떎." };
  }

  if (currentStatus === nextStatus) {
    return { ok: true };
  }

  if (!isTournamentStatus(nextStatus)) {
    return { ok: false, error: "?占쎈せ???占쏀깭 媛믪엯?占쎈떎." };
  }

  if (nextStatus !== "finished") {
    const allowed = ["draft", "open", "closed"].includes(nextStatus);
    if (!allowed) {
      return { ok: false, error: "?占쎌슜?占쏙옙? ?占쏙옙? ?占쏀깭 ?占쎌씠?占쎈땲??" };
    }
  }

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({ status: nextStatus })
    .eq("id", tournamentId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function getOpenTournaments(): Promise<
  ApiResult<PublicTournamentRow[]>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .eq("status", "open")
    .is("deleted_at", null)
    .order("start_date", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getInProgressTournaments(): Promise<
  ApiResult<PublicTournamentRow[]>
> {
  const supabase = await createSupabaseServerClient();
  const { data: closedTournaments, error: closedError } = await supabase
    .from("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .eq("status", "closed")
    .is("deleted_at", null)
    .order("start_date", { ascending: true });

  if (closedError) {
    return { data: null, error: closedError.message };
  }

  const closedList = closedTournaments ?? [];

  if (closedList.length === 0) {
    return { data: [], error: null };
  }

  const closedIds = closedList.map((tournament) => tournament.id);
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("tournament_id")
    .in("tournament_id", closedIds)
    .neq("status", "completed");

  if (matchesError) {
    return { data: null, error: matchesError.message };
  }

  const activeIds = new Set(
    (matches as { tournament_id: string }[] | null)?.map(
      (row) => row.tournament_id
    ) ?? []
  );

  return {
    data: closedList.filter((tournament) => activeIds.has(tournament.id)),
    error: null,
  };
}

export async function getPublicTournamentById(
  tournamentId: string
): Promise<ApiResult<PublicTournamentRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .eq("id", tournamentId)
    .is("deleted_at", null)
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
    .from("tournaments")
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
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", tournamentId)
    .select("id,name,status")
    .single();

  return {
    data,
    error: error ? error.message : null,
  };
}
