import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { requireOrganizer } from "@/src/lib/auth/guards";
import type { ApiResult, ActionResult } from "@/lib/types/api";

export type TournamentStatus = "draft" | "open" | "closed" | "finished";

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
  description: string | null;
  poster_url: string | null;
};

type TournamentUpdatePayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
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
    .select("id,name,location,start_date,end_date,status,schedule_start_at,description,poster_url")
    .eq("id", tournamentId)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function softDeleteTournament(
  tournamentId: string
): Promise<ActionResult> {
  const authResult = await requireOrganizer();

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
  const authResult = await requireOrganizer();

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
  const authResult = await requireOrganizer();

  if (!authResult.ok) return authResult;

  if (!payload.name.trim()) {
    return { ok: false, error: "대회명은 필수입니다." };
  }

  if (!payload.start_date || !payload.end_date) {
    return { ok: false, error: "시작일과 종료일을 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("tournaments")
    .update({
      name: payload.name,
      location: payload.location,
      start_date: payload.start_date,
      end_date: payload.end_date,
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
  const authResult = await requireOrganizer();
  if (!authResult.ok) return authResult;
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
  const authResult = await requireOrganizer();

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
    return { ok: false, error: "대회를 찾을 수 없습니다." };
  }

  const currentStatus = data.status;

  if (currentStatus === "finished") {
    return { ok: false, error: "종료된 대회는 변경할 수 없습니다." };
  }

  if (currentStatus === nextStatus) {
    return { ok: true };
  }

  if (!isTournamentStatus(nextStatus)) {
    return { ok: false, error: "유효하지 않은 상태입니다." };
  }

  if (nextStatus !== "finished") {
    const allowed = ["draft", "open", "closed"].includes(nextStatus);
    if (!allowed) {
      return { ok: false, error: "허용되지 않는 상태 전환입니다." };
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
    .select("id,name,location,start_date,end_date,status,description,poster_url")
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
    .select("id,name,location,start_date,end_date,status,description,poster_url")
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

export type MyParticipatedTournamentRow = PublicTournamentRow & {
  team_name: string;
};

export async function getMyParticipatedTournaments(): Promise<
  ApiResult<{
    participating: MyParticipatedTournamentRow[];
    past: MyParticipatedTournamentRow[];
  }>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "로그인이 필요합니다." };

  // 내 팀 목록
  const { data: members } = await supabase
    .from("team_members")
    .select("team_id, teams(team_name)")
    .eq("user_id", user.id);

  const teamIds = (members ?? []).map(
    (m: Record<string, unknown>) => m.team_id as string
  );
  if (teamIds.length === 0)
    return { data: { participating: [], past: [] }, error: null };

  const teamNameMap = new Map(
    (members ?? []).map((m: Record<string, unknown>) => {
      const teams = m.teams as { team_name: string } | null;
      return [m.team_id as string, teams?.team_name ?? ""];
    })
  );

  // confirmed 신청이 있는 대회 조회
  const { data: apps, error: appsError } = await supabase
    .from("tournament_team_applications")
    .select(
      "tournament_id, team_id, tournaments(id, name, location, start_date, end_date, status, description, poster_url, deleted_at)"
    )
    .in("team_id", teamIds)
    .eq("status", "confirmed");

  if (appsError) return { data: null, error: appsError.message };

  const participating: MyParticipatedTournamentRow[] = [];
  const past: MyParticipatedTournamentRow[] = [];
  const seenIds = new Set<string>();

  for (const app of (apps ?? []) as Record<string, unknown>[]) {
    const t = app.tournaments as Record<string, unknown> | null;
    if (!t || t.deleted_at) continue;

    const tid = t.id as string;
    if (seenIds.has(tid)) continue;
    seenIds.add(tid);

    const row: MyParticipatedTournamentRow = {
      id: tid,
      name: t.name as string,
      location: (t.location as string | null) ?? null,
      start_date: (t.start_date as string | null) ?? null,
      end_date: (t.end_date as string | null) ?? null,
      status: t.status as TournamentStatus,
      description: (t.description as string | null) ?? null,
      poster_url: (t.poster_url as string | null) ?? null,
      team_name: teamNameMap.get(app.team_id as string) ?? "",
    };

    if (t.status === "closed") participating.push(row);
    else if (t.status === "finished") past.push(row);
  }

  return { data: { participating, past }, error: null };
}

export async function getPublicTournamentById(
  tournamentId: string
): Promise<ApiResult<PublicTournamentRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id,name,location,start_date,end_date,status,description,poster_url")
    .eq("id", tournamentId)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

