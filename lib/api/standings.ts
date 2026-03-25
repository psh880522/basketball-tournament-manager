import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ApiResult<T> = {
    data: T | null;
    error: string | null;
};

type DivisionGroupRow = {
    id: string;
    name: string;
    groups: { id: string; name: string; order: number }[] | null;
};

type GroupSummaryRow = {
    id: string;
    division_id: string;
    divisions: { tournament_id: string } | null;
};

type GroupTeamRow = {
    team_id: string;
    teams: { id: string; team_name: string } | null;
};

type StandingRow = {
    id: string;
    group_id: string;
    team_id: string;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
    points_diff: number;
    rank: number;
    teams: { team_name: string } | null;
};

type GroupStandingRow = {
    id: string;
    team_id: string;
    rank: number;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
    points_diff: number;
    teams: { team_name: string } | null;
};

type DivisionStandingRow = {
    id: string;
    team_id: string;
    rank: number;
};

export type DivisionStandingsRow = {
    id: string;
    division_id: string;
    team_id: string;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
    points_diff: number;
    rank: number;
    teams: { team_name: string } | null;
};

type StandingUpsert = {
    tournament_id: string;
    division_id: string;
    group_id: string;
    team_id: string;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
    points_diff: number;
    rank: number;
};

export async function getDivisionsWithGroups(
    tournamentId: string
): Promise<ApiResult<DivisionGroupRow[]>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("divisions")
        .select("id,name,groups(id,name,order)")
        .eq("tournament_id", tournamentId);

    return {
        data,
        error: error ? error.message : null,
    };
}

export async function getGroupSummary(
    groupId: string
): Promise<ApiResult<GroupSummaryRow>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("groups")
        .select("id,division_id,divisions(tournament_id)")
        .eq("id", groupId)
        .maybeSingle();

    return {
        data: data as GroupSummaryRow | null,
        error: error ? error.message : null,
    };
}

export async function getGroupTeams(
    groupId: string
): Promise<ApiResult<GroupTeamRow[]>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("group_teams")
        .select("team_id,teams(id,team_name)")
        .eq("group_id", groupId);

    return {
        data: data as GroupTeamRow[] | null,
        error: error ? error.message : null,
    };
}

export async function upsertStandings(
    entries: StandingUpsert[]
): Promise<ApiResult<{ id: string }[]>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("standings")
        .upsert(entries, { onConflict: "group_id,team_id" })
        .select("id");

    return {
        data: data as { id: string }[] | null,
        error: error ? error.message : null,
    };
}

export async function getStandingsByGroup(
    groupId: string
): Promise<ApiResult<StandingRow[]>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("standings")
        .select(
            "id,group_id,team_id,wins,losses,points_for,points_against,points_diff,rank,teams(team_name)"
        )
        .eq("group_id", groupId)
        .order("rank", { ascending: true });

    return {
        data: data as StandingRow[] | null,
        error: error ? error.message : null,
    };
}

export async function getGroupStandings(
    tournamentId: string,
    divisionId: string,
    groupId: string
): Promise<ApiResult<GroupStandingRow[]>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("standings")
        .select(
            "id,team_id,rank,wins,losses,points_for,points_against,points_diff,teams(team_name)"
        )
        .eq("tournament_id", tournamentId)
        .eq("division_id", divisionId)
        .eq("group_id", groupId)
        .order("rank", { ascending: true });

    return {
        data: data as GroupStandingRow[] | null,
        error: error ? error.message : null,
    };
}

export async function getStandingsByDivision(
    divisionId: string
): Promise<ApiResult<DivisionStandingRow[]>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("standings")
        .select("id,team_id,rank")
        .eq("division_id", divisionId)
        .order("rank", { ascending: true });

    return {
        data,
        error: error ? error.message : null,
    };
}

export async function listStandingsPageData(
    tournamentId: string
): Promise<
    ApiResult<{
        divisions: {
            id: string;
            name: string;
            sort_order: number;
            standings_dirty: boolean;
        }[];
        standings: DivisionStandingsRow[];
    }>
> {
    const supabase = await createSupabaseServerClient();

    const { data: divisions, error: divisionsError } = await supabase
        .from("divisions")
        .select("id,name,sort_order,standings_dirty")
        .eq("tournament_id", tournamentId)
        .order("sort_order", { ascending: true });

    if (divisionsError) {
        return { data: null, error: divisionsError.message };
    }

    const { data: standings, error: standingsError } = await supabase
        .from("standings")
        .select(
            "id,division_id,team_id,wins,losses,points_for,points_against,points_diff,rank,teams(team_name)"
        )
        .eq("tournament_id", tournamentId)
        .is("group_id", null)
        .order("rank", { ascending: true });

    if (standingsError) {
        return { data: null, error: standingsError.message };
    }

    return {
        data: {
            divisions: (divisions ?? []) as {
                id: string;
                name: string;
                sort_order: number;
                standings_dirty: boolean;
            }[],
            standings: (standings ?? []) as unknown as DivisionStandingsRow[],
        },
        error: null,
    };
}

export async function replaceDivisionStandings(
    tournamentId: string,
    divisionId: string,
    rows: {
        team_id: string;
        wins: number;
        losses: number;
        points_for: number;
        points_against: number;
        points_diff: number;
        rank: number;
    }[]
): Promise<ApiResult<{ id: string }[]>> {
    const supabase = await createSupabaseServerClient();

    const { error: deleteError } = await supabase
        .from("standings")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("division_id", divisionId)
        .is("group_id", null);

    if (deleteError) {
        return { data: null, error: deleteError.message };
    }

    if (rows.length === 0) {
        return { data: [], error: null };
    }

    const { data, error } = await supabase
        .from("standings")
        .insert(
            rows.map((row) => ({
                tournament_id: tournamentId,
                division_id: divisionId,
                group_id: null,
                team_id: row.team_id,
                wins: row.wins,
                losses: row.losses,
                points_for: row.points_for,
                points_against: row.points_against,
                points_diff: row.points_diff,
                rank: row.rank,
            }))
        )
        .select("id");

    return {
        data: data as { id: string }[] | null,
        error: error ? error.message : null,
    };
}
