import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listApprovedTeamsByDivision } from "@/lib/api/applications";
import { createGroups, createGroupTeams, createMatches } from "@/lib/api/bracket";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export type ScheduleValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export type ScheduleSlotMatch = {
  id: string;
  round: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a: string | null;
  team_b: string | null;
  score_a: number | null;
  score_b: number | null;
  group_key: string | null;
};

export type ScheduleSlot = {
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
  group_key: string | null;
  match: ScheduleSlotMatch | null;
};

export type ScheduleSlotGroup = {
  group_key: string;
  slots: ScheduleSlot[];
};

export type ScheduleSlotDivisionGroup = {
  division: { id: string; name: string } | null;
  groups: ScheduleSlotGroup[];
  tournament_slots: ScheduleSlot[];
};

export type ScheduleSlotCourtGroup = {
  court: { id: string; name: string } | null;
  divisions: ScheduleSlotDivisionGroup[];
};

export type ScheduleSlotGroupOption = {
  id: string;
  division_id: string;
  name: string;
  order: number;
};

const GROUP_LABEL_SEPARATOR = "::";

function buildGroupLabel(groupKey: string) {
  return `${groupKey}${GROUP_LABEL_SEPARATOR}휴식시간`;
}

function parseGroupKeyFromLabel(label: string | null) {
  if (!label) return null;
  const [groupKey] = label.split(GROUP_LABEL_SEPARATOR);
  return groupKey ? groupKey.trim() : null;
}

function compareSlotTime(left: ScheduleSlot, right: ScheduleSlot) {
  const leftTime = left.start_at ? Date.parse(left.start_at) : null;
  const rightTime = right.start_at ? Date.parse(right.start_at) : null;
  if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (leftTime !== null && rightTime === null) return -1;
  if (leftTime === null && rightTime !== null) return 1;
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.id.localeCompare(right.id);
}

export async function getDivisionGroupsByTournament(
  tournamentId: string
): Promise<ApiResult<ScheduleSlotGroupOption[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id,division_id,name,order,divisions!inner(tournament_id)")
    .eq("divisions.tournament_id", tournamentId)
    .order("division_id", { ascending: true })
    .order("order", { ascending: true });

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []).map((row) => ({
    id: row.id as string,
    division_id: row.division_id as string,
    name: row.name as string,
    order: (row.order as number) ?? 0,
  }));

  return { data: rows, error: null };
}

export async function getScheduleSlots(
  tournamentId: string
): Promise<ApiResult<ScheduleSlotCourtGroup[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("schedule_slots")
    .select(
      "id,slot_type,stage_type,start_at,end_at,court_id,division_id,match_id,label,sort_order,divisions(id,name),courts(id,name),matches!schedule_slots_match_id_fkey(id,round,score_a,score_b,group_id,groups(name,order),team_a:teams!matches_team_a_id_fkey(id,team_name),team_b:teams!matches_team_b_id_fkey(id,team_name))"
    )
    .eq("tournament_id", tournamentId)
    .order("court_id", { ascending: true })
    .order("division_id", { ascending: true })
    .order("stage_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { data: null, error: error.message };

  const slots = (data ?? []) as Record<string, unknown>[];
  const resolvedGroupKeyBySlotId = new Map<string, string>();
  const groupStageBuckets = new Map<string, Record<string, unknown>[]>();
  const divisionStageBuckets = new Map<string, Record<string, unknown>[]>();

  const getRowId = (row: Record<string, unknown>) => row.id as string;
  const getRowCourt = (row: Record<string, unknown>) =>
    (row.court_id as string | null) ?? "__unassigned__";
  const getRowDivision = (row: Record<string, unknown>) =>
    (row.division_id as string | null) ?? "__unassigned__";
  const getRowStart = (row: Record<string, unknown>) =>
    (row.start_at as string | null) ?? null;
  const getRowSort = (row: Record<string, unknown>) =>
    (row.sort_order as number | null) ?? 0;

  slots.forEach((row) => {
    const stageType = row.stage_type as string | null;
    if (stageType !== "group") return;
    const key = `${getRowCourt(row)}::${getRowDivision(row)}`;
    const list = groupStageBuckets.get(key) ?? [];
    list.push(row);
    groupStageBuckets.set(key, list);

    const divisionKey = getRowDivision(row);
    const divisionList = divisionStageBuckets.get(divisionKey) ?? [];
    divisionList.push(row);
    divisionStageBuckets.set(divisionKey, divisionList);
  });

  groupStageBuckets.forEach((list) => {
    const ordered = [...list].sort((a, b) => {
      const timeA = getRowStart(a) ? Date.parse(getRowStart(a) as string) : null;
      const timeB = getRowStart(b) ? Date.parse(getRowStart(b) as string) : null;
      if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
      if (timeA !== null && timeB === null) return -1;
      if (timeA === null && timeB !== null) return 1;
      const sortA = getRowSort(a);
      const sortB = getRowSort(b);
      if (sortA !== sortB) return sortA - sortB;
      return getRowId(a).localeCompare(getRowId(b));
    });

    let lastGroupKey: string | null = null;
    const pendingBreaks: Record<number, string> = {};
    ordered.forEach((row) => {
      const match = row.matches as
        | {
            groups: { name: string } | null;
          }
        | null;
      const slotType = row.slot_type as string;
      let groupKey = match?.groups?.name ?? null;
      if (!groupKey && slotType !== "match") {
        groupKey = parseGroupKeyFromLabel(row.label as string | null);
      }
      if (groupKey) {
        lastGroupKey = groupKey;
        return;
      }
      if (slotType === "break") {
        if (lastGroupKey) {
          resolvedGroupKeyBySlotId.set(getRowId(row), lastGroupKey);
        } else {
          pendingBreaks[index] = getRowId(row);
        }
      }
    });

    if (Object.keys(pendingBreaks).length > 0) {
      let nextGroupKey: string | null = null;
      for (let i = ordered.length - 1; i >= 0; i -= 1) {
        const row = ordered[i];
        const match = row.matches as
          | {
              groups: { name: string } | null;
            }
          | null;
        const slotType = row.slot_type as string;
        let groupKey = match?.groups?.name ?? null;
        if (!groupKey && slotType !== "match") {
          groupKey = parseGroupKeyFromLabel(row.label as string | null);
        }
        if (groupKey) {
          nextGroupKey = groupKey;
          continue;
        }
        const pendingId = pendingBreaks[i];
        if (pendingId && nextGroupKey) {
          resolvedGroupKeyBySlotId.set(pendingId, nextGroupKey);
        }
      }
    }
  });

  divisionStageBuckets.forEach((list) => {
    const ordered = [...list].sort((a, b) => {
      const timeA = getRowStart(a) ? Date.parse(getRowStart(a) as string) : null;
      const timeB = getRowStart(b) ? Date.parse(getRowStart(b) as string) : null;
      if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
      if (timeA !== null && timeB === null) return -1;
      if (timeA === null && timeB !== null) return 1;
      const sortA = getRowSort(a);
      const sortB = getRowSort(b);
      if (sortA !== sortB) return sortA - sortB;
      return getRowId(a).localeCompare(getRowId(b));
    });

    let lastGroupKey: string | null = null;
    const pendingBreaks: Record<number, string> = {};
    ordered.forEach((row, index) => {
      const rowId = getRowId(row);
      if (resolvedGroupKeyBySlotId.has(rowId)) return;

      const match = row.matches as
        | {
            groups: { name: string } | null;
          }
        | null;
      const slotType = row.slot_type as string;
      let groupKey = match?.groups?.name ?? null;
      if (!groupKey && slotType !== "match") {
        groupKey = parseGroupKeyFromLabel(row.label as string | null);
      }
      if (groupKey) {
        lastGroupKey = groupKey;
        return;
      }
      if (slotType === "break") {
        if (lastGroupKey) {
          resolvedGroupKeyBySlotId.set(rowId, lastGroupKey);
        } else {
          pendingBreaks[index] = rowId;
        }
      }
    });

    if (Object.keys(pendingBreaks).length > 0) {
      let nextGroupKey: string | null = null;
      for (let i = ordered.length - 1; i >= 0; i -= 1) {
        const row = ordered[i];
        const rowId = getRowId(row);
        if (resolvedGroupKeyBySlotId.has(rowId)) continue;
        const match = row.matches as
          | {
              groups: { name: string } | null;
            }
          | null;
        const slotType = row.slot_type as string;
        let groupKey = match?.groups?.name ?? null;
        if (!groupKey && slotType !== "match") {
          groupKey = parseGroupKeyFromLabel(row.label as string | null);
        }
        if (groupKey) {
          nextGroupKey = groupKey;
          continue;
        }
        const pendingId = pendingBreaks[i];
        if (pendingId && nextGroupKey) {
          resolvedGroupKeyBySlotId.set(pendingId, nextGroupKey);
        }
      }
    }
  });

  const courtMap = new Map<string, ScheduleSlotCourtGroup>();
  const courtOrder: string[] = [];

  slots.forEach((row) => {
    const court = row.courts as { id: string; name: string } | null;
    const division = row.divisions as { id: string; name: string } | null;
    const match = row.matches as
      | {
          id: string;
          score_a: number | null;
          score_b: number | null;
          group_id: string | null;
          groups: { name: string; order: number } | null;
          team_a: { team_name: string } | null;
          team_b: { team_name: string } | null;
        }
      | null;

    const courtKey = court?.id ?? "__unassigned__";
    if (!courtMap.has(courtKey)) {
      courtMap.set(courtKey, {
        court: court ?? null,
        divisions: [],
      });
      courtOrder.push(courtKey);
    }

    const courtGroup = courtMap.get(courtKey);
    if (!courtGroup) return;

    const divisionKey = division?.id ?? "__unassigned__";
    let divisionGroup = courtGroup.divisions.find(
      (d) => (d.division?.id ?? "__unassigned__") === divisionKey
    );
    if (!divisionGroup) {
      divisionGroup = {
        division: division ?? null,
        groups: [],
        tournament_slots: [],
      };
      courtGroup.divisions.push(divisionGroup);
    }

    const groupKey =
      match?.groups?.name ??
      (row.slot_type !== "match" && row.stage_type === "group"
        ? resolvedGroupKeyBySlotId.get(row.id as string) ??
          parseGroupKeyFromLabel(row.label as string | null)
        : null);

    const slot: ScheduleSlot = {
      id: row.id as string,
      slot_type: row.slot_type as string,
      stage_type: (row.stage_type as string | null) ?? null,
      start_at: (row.start_at as string | null) ?? null,
      end_at: (row.end_at as string | null) ?? null,
      court_id: (row.court_id as string | null) ?? null,
      division_id: (row.division_id as string | null) ?? null,
      match_id: (row.match_id as string | null) ?? null,
      label: (row.label as string | null) ?? null,
      sort_order: (row.sort_order as number) ?? 0,
      group_key: groupKey,
      match: match
        ? {
            id: match.id,
            round: (match.round as string | null) ?? null,
            team_a_id: (match.team_a?.id as string | null) ?? null,
            team_b_id: (match.team_b?.id as string | null) ?? null,
            team_a: match.team_a?.team_name ?? null,
            team_b: match.team_b?.team_name ?? null,
            score_a: match.score_a ?? null,
            score_b: match.score_b ?? null,
            group_key: groupKey,
          }
        : null,
    };

    if (slot.stage_type === "tournament") {
      divisionGroup.tournament_slots.push(slot);
    } else {
      const fallbackKey = groupKey ?? "미지정 조";
      let groupEntry = divisionGroup.groups.find(
        (group) => group.group_key === fallbackKey
      );
      if (!groupEntry) {
        groupEntry = { group_key: fallbackKey, slots: [] };
        divisionGroup.groups.push(groupEntry);
      }
      groupEntry.slots.push(slot);
    }
  });

  courtMap.forEach((courtGroup) => {
    courtGroup.divisions.forEach((divisionGroup) => {
      divisionGroup.groups.sort((a, b) => a.group_key.localeCompare(b.group_key));
      divisionGroup.groups.forEach((group) => {
        group.slots.sort(compareSlotTime);
      });
      divisionGroup.tournament_slots.sort(compareSlotTime);
    });
  });

  const result = courtOrder.map((key) => courtMap.get(key) as ScheduleSlotCourtGroup);

  return { data: result, error: null };
}

async function requireOrganizer(): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getUserWithRole();
  if (auth.status !== "ready" || auth.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }
  return { ok: true };
}

async function getDivision(
  tournamentId: string,
  divisionId: string
): Promise<
  | { ok: true; division: { id: string; name: string; group_size: number | null } }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("divisions")
    .select("id,name,group_size")
    .eq("id", divisionId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Division을 찾을 수 없습니다." };

  return { ok: true, division: data as { id: string; name: string; group_size: number | null } };
}

async function getTournament(tournamentId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id")
    .eq("id", tournamentId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "대회를 찾을 수 없습니다." };

  return { ok: true };
}

async function getNextSortOrder(
  tournamentId: string,
  divisionId: string,
  stageType: string
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("schedule_slots")
    .select("sort_order")
    .eq("tournament_id", tournamentId)
    .eq("division_id", divisionId)
    .eq("stage_type", stageType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? -1) + 1;
}

export async function seedGroupMatchSlots(input: {
  tournamentId: string;
  divisionId: string;
  groupSize: number;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId, groupSize } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  if (!groupSize || groupSize < 2) {
    return { ok: false, error: "group_size는 2 이상이어야 합니다." };
  }

  const divisionResult = await getDivision(tournamentId, divisionId);
  if (!divisionResult.ok) return divisionResult;

  const existingSlots = await getScheduleSlotsByStage(
    tournamentId,
    divisionId,
    "group"
  );
  if (existingSlots > 0) {
    return { ok: false, error: "이미 그룹 슬롯이 존재합니다." };
  }

  const teamsResult = await listApprovedTeamsByDivision(tournamentId, divisionId);
  if (teamsResult.error) return { ok: false, error: teamsResult.error };
  const teams = (teamsResult.data ?? []).map((t) => ({
    id: t.team_id,
    name: t.team_name,
  }));

  if (teams.length < 2) {
    return { ok: false, error: "승인된 팀이 2개 이상 필요합니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingMatches, error: matchErr } = await supabase
    .from("matches")
    .select("id,group_id,created_at")
    .eq("division_id", divisionId)
    .not("group_id", "is", null)
    .order("created_at", { ascending: true });

  if (matchErr) return { ok: false, error: matchErr.message };

  let matches = (existingMatches ?? []) as { id: string; group_id: string | null; created_at: string }[];

  if (matches.length === 0) {
    const { data: groups, error: groupsErr } = await supabase
      .from("groups")
      .select("id,order")
      .eq("division_id", divisionId)
      .order("order", { ascending: true });

    let groupRows = (groups ?? []) as { id: string; order: number }[];

    if (groupsErr) return { ok: false, error: groupsErr.message };

    if (groupRows.length === 0) {
      const groupCount = Math.ceil(teams.length / groupSize);
      const groupDefs = Array.from({ length: groupCount }, (_, i) => ({
        name: `${String.fromCharCode(65 + i)}조`,
        order: i + 1,
      }));

      const createdGroups = await createGroups(divisionId, groupDefs);
      if (createdGroups.error) return { ok: false, error: createdGroups.error };
      groupRows = (createdGroups.data ?? []).map((g) => ({
        id: g.id,
        order: g.order,
      }));
    }

    const { data: existingGroupTeams } = await supabase
      .from("group_teams")
      .select("group_id,team_id")
      .in(
        "group_id",
        groupRows.map((g) => g.id)
      );

    if (!existingGroupTeams || existingGroupTeams.length === 0) {
      const groupTeams: { group_id: string; team_id: string }[] = [];
      teams.forEach((team, index) => {
        const groupIndex = Math.floor(index / groupSize);
        const group = groupRows[Math.min(groupIndex, groupRows.length - 1)];
        if (!group) return;
        groupTeams.push({ group_id: group.id, team_id: team.id });
      });

      const groupTeamsResult = await createGroupTeams(groupTeams);
      if (groupTeamsResult.error) {
        return { ok: false, error: groupTeamsResult.error };
      }
    }

    const { data: groupTeamsData, error: groupTeamsErr } = await supabase
      .from("group_teams")
      .select("group_id,team_id")
      .in(
        "group_id",
        groupRows.map((g) => g.id)
      );

    if (groupTeamsErr) return { ok: false, error: groupTeamsErr.message };

    const teamsByGroup = new Map<string, string[]>();
    (groupTeamsData ?? []).forEach((row) => {
      const list = teamsByGroup.get(row.group_id) ?? [];
      list.push(row.team_id);
      teamsByGroup.set(row.group_id, list);
    });

    const matchEntries: {
      tournament_id: string;
      division_id: string;
      group_id: string | null;
      team_a_id: string;
      team_b_id: string;
      status: string;
      court_id: string | null;
    }[] = [];

    teamsByGroup.forEach((teamIds, groupId) => {
      for (let i = 0; i < teamIds.length; i += 1) {
        for (let j = i + 1; j < teamIds.length; j += 1) {
          matchEntries.push({
            tournament_id: tournamentId,
            division_id: divisionId,
            group_id: groupId,
            team_a_id: teamIds[i],
            team_b_id: teamIds[j],
            status: "scheduled",
            court_id: null,
          });
        }
      }
    });

    if (matchEntries.length === 0) {
      return { ok: false, error: "생성할 경기가 없습니다." };
    }

    const matchResult = await createMatches(matchEntries);
    if (matchResult.error) return { ok: false, error: matchResult.error };

    const { data: refreshedMatches, error: refreshErr } = await supabase
      .from("matches")
      .select("id,group_id,created_at")
      .eq("division_id", divisionId)
      .not("group_id", "is", null)
      .order("created_at", { ascending: true });

    if (refreshErr) return { ok: false, error: refreshErr.message };
    matches = (refreshedMatches ?? []) as { id: string; group_id: string | null; created_at: string }[];
  }

  const nextOrder = await getNextSortOrder(tournamentId, divisionId, "group");
  const slotsToInsert = matches.map((match, index) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    slot_type: "match",
    stage_type: "group",
    match_id: match.id,
    label: null,
    court_id: null,
    start_at: null,
    end_at: null,
    sort_order: nextOrder + index,
  }));

  const { data: createdSlots, error: slotErr } = await supabase
    .from("schedule_slots")
    .insert(slotsToInsert)
    .select("id,match_id");

  if (slotErr) return { ok: false, error: slotErr.message };

  for (const slot of createdSlots ?? []) {
    if (!slot.match_id) continue;
    const { error } = await supabase
      .from("matches")
      .update({ slot_id: slot.id })
      .eq("id", slot.match_id);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function seedTournamentMatchSlots(input: {
  tournamentId: string;
  divisionId: string;
  tournamentSize: number;
  assignToTournament: boolean;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId, tournamentSize, assignToTournament } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const allowedSizes = [4, 8, 16];
  if (!allowedSizes.includes(tournamentSize)) {
    return { ok: false, error: "토너먼트 크기는 4/8/16만 허용됩니다." };
  }

  const divisionResult = await getDivision(tournamentId, divisionId);
  if (!divisionResult.ok) return divisionResult;

  const existingSlots = await getScheduleSlotsByStage(
    tournamentId,
    divisionId,
    "tournament"
  );
  if (existingSlots > 0) {
    return { ok: false, error: "이미 토너먼트 슬롯이 존재합니다." };
  }

  const supabase = await createSupabaseServerClient();
  let matches: { id: string }[] = [];

  if (assignToTournament) {
    const { data: existingMatches, error: matchErr } = await supabase
      .from("matches")
      .select("id")
      .eq("division_id", divisionId)
      .is("group_id", null)
      .order("created_at", { ascending: true });

    if (matchErr) return { ok: false, error: matchErr.message };
    matches = (existingMatches ?? []) as { id: string }[];

    if (matches.length === 0) {
      const teamsResult = await listApprovedTeamsByDivision(tournamentId, divisionId);
      if (teamsResult.error) return { ok: false, error: teamsResult.error };

      const teams = (teamsResult.data ?? []).map((t) => t.team_id);
      if (teams.length < tournamentSize) {
        return { ok: false, error: "승인된 팀 수가 부족합니다." };
      }

      const selected = teams.slice(0, tournamentSize);
      const initialRound =
        tournamentSize === 4
          ? "semifinal"
          : tournamentSize === 8
          ? "quarterfinal"
          : tournamentSize === 16
          ? "round_of_16"
          : null;

      if (!initialRound) {
        return { ok: false, error: "토너먼트 크기는 4/8/16만 허용됩니다." };
      }
      const matchEntries = [] as {
        tournament_id: string;
        division_id: string;
        group_id: string | null;
        round: string | null;
        team_a_id: string | null;
        team_b_id: string | null;
        status: string;
        court_id: string | null;
      }[];

      const pushMatch = (
        round: string,
        teamAId: string | null,
        teamBId: string | null
      ) => {
        matchEntries.push({
          tournament_id: tournamentId,
          division_id: divisionId,
          group_id: null,
          round,
          team_a_id: teamAId,
          team_b_id: teamBId,
          status: "scheduled",
          court_id: null,
        });
      };

      for (let i = 0; i < selected.length; i += 2) {
        pushMatch(initialRound, selected[i] ?? null, selected[i + 1] ?? null);
      }

      if (tournamentSize === 4) {
        pushMatch("final", null, null);
        pushMatch("third_place", null, null);
      }

      if (tournamentSize === 8) {
        for (let i = 0; i < 2; i += 1) {
          pushMatch("semifinal", null, null);
        }
        pushMatch("final", null, null);
        pushMatch("third_place", null, null);
      }

      if (tournamentSize === 16) {
        for (let i = 0; i < 4; i += 1) {
          pushMatch("quarterfinal", null, null);
        }
        for (let i = 0; i < 2; i += 1) {
          pushMatch("semifinal", null, null);
        }
        pushMatch("final", null, null);
        pushMatch("third_place", null, null);
      }

      const created = await createMatches(matchEntries);
      if (created.error) return { ok: false, error: created.error };

      const { data: refreshedMatches, error: refreshErr } = await supabase
        .from("matches")
        .select("id")
        .eq("division_id", divisionId)
        .is("group_id", null)
        .order("created_at", { ascending: true });

      if (refreshErr) return { ok: false, error: refreshErr.message };
      matches = (refreshedMatches ?? []) as { id: string }[];
    }
  }

  const totalSlots = assignToTournament
    ? Math.max(matches.length, tournamentSize)
    : tournamentSize;
  const nextOrder = await getNextSortOrder(tournamentId, divisionId, "tournament");
  const slotsToInsert = Array.from({ length: totalSlots }, (_, index) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    slot_type: "match",
    stage_type: "tournament",
    match_id: matches[index]?.id ?? null,
    label: null,
    court_id: null,
    start_at: null,
    end_at: null,
    sort_order: nextOrder + index,
  }));

  const { data: createdSlots, error: slotErr } = await supabase
    .from("schedule_slots")
    .insert(slotsToInsert)
    .select("id,match_id");

  if (slotErr) return { ok: false, error: slotErr.message };

  if (assignToTournament) {
    for (const slot of createdSlots ?? []) {
      if (!slot.match_id) continue;
      const { error } = await supabase
        .from("matches")
        .update({ slot_id: slot.id })
        .eq("id", slot.match_id);
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

export async function seedBreakSlots(input: {
  tournamentId: string;
  divisionId: string;
  stageType: "group" | "tournament";
  groupKey: string | null;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId, stageType, groupKey } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  if (stageType === "group" && !groupKey) {
    return { ok: false, error: "그룹을 선택하세요." };
  }

  const divisionResult = await getDivision(tournamentId, divisionId);
  if (!divisionResult.ok) return divisionResult;

  const nextOrder = await getNextSortOrder(tournamentId, divisionId, stageType);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("schedule_slots").insert({
    tournament_id: tournamentId,
    division_id: divisionId,
    slot_type: "break",
    stage_type: stageType,
    match_id: null,
    label:
      stageType === "group" && groupKey
        ? buildGroupLabel(groupKey)
        : "휴식시간",
    court_id: null,
    start_at: null,
    end_at: null,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function seedGroupMatchSlotsFromBracket(input: {
  tournamentId: string;
  divisionId: string;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const divisionResult = await getDivision(tournamentId, divisionId);
  if (!divisionResult.ok) return divisionResult;

  const existingSlots = await getScheduleSlotsByStage(
    tournamentId,
    divisionId,
    "group"
  );
  if (existingSlots > 0) {
    return { ok: false, error: "이미 그룹 슬롯이 존재합니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id")
    .eq("division_id", divisionId)
    .not("group_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!matches || matches.length === 0) {
    return { ok: false, error: "리그 경기가 없습니다." };
  }

  const nextOrder = await getNextSortOrder(tournamentId, divisionId, "group");
  const slotsToInsert = matches.map((match, index) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    slot_type: "match",
    stage_type: "group",
    match_id: match.id,
    label: null,
    court_id: null,
    start_at: null,
    end_at: null,
    sort_order: nextOrder + index,
  }));

  const { error: slotErr } = await supabase
    .from("schedule_slots")
    .insert(slotsToInsert);

  if (slotErr) return { ok: false, error: slotErr.message };

  return { ok: true };
}

export async function generateScheduleSlots(input: {
  tournamentId: string;
  startTime: string;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, startTime, matchDurationMinutes, breakDurationMinutes } =
    input;
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!startTime) return { ok: false, error: "시작 시간을 입력하세요." };
  if (!matchDurationMinutes || matchDurationMinutes <= 0) {
    return { ok: false, error: "경기 시간은 1분 이상이어야 합니다." };
  }
  if (breakDurationMinutes < 0) {
    return { ok: false, error: "휴식 시간은 0분 이상이어야 합니다." };
  }

  const startDate = new Date(startTime);
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: "시작 시간이 유효하지 않습니다." };
  }

  const tournamentResult = await getTournament(tournamentId);
  if (!tournamentResult.ok) return tournamentResult;

  const supabase = await createSupabaseServerClient();
  const { count: existingCount, error: existingErr } = await supabase
    .from("schedule_slots")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (existingErr) return { ok: false, error: existingErr.message };
  if ((existingCount ?? 0) > 0) {
    return { ok: false, error: "이미 스케줄 슬롯이 존재합니다." };
  }

  const { data: divisions, error: divisionsErr } = await supabase
    .from("divisions")
    .select("id,sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (divisionsErr) return { ok: false, error: divisionsErr.message };

  const divisionOrder = new Map(
    (divisions ?? []).map((division, index) => [division.id as string, index])
  );

  const { data: courts, error: courtsErr } = await supabase
    .from("courts")
    .select("id,display_order,name")
    .eq("tournament_id", tournamentId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (courtsErr) return { ok: false, error: courtsErr.message };
  if (!courts || courts.length === 0) {
    return { ok: false, error: "코트를 먼저 추가하세요." };
  }

  const courtOrder = (courts ?? []).map((court) => court.id as string);

  const { data: matches, error: matchesErr } = await supabase
    .from("matches")
    .select("id,division_id,group_id,court_id,round,created_at,groups(name,order)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (matchesErr) return { ok: false, error: matchesErr.message };
  if (!matches || matches.length === 0) {
    return { ok: false, error: "생성된 경기가 없습니다." };
  }

  const slotsToInsert: {
    tournament_id: string;
    division_id: string | null;
    slot_type: string;
    stage_type: string | null;
    match_id: string | null;
    label: string | null;
    court_id: string | null;
    start_at: string | null;
    end_at: string | null;
    sort_order: number;
  }[] = [];

  const divisionIds = [...divisionOrder.keys()];
  const matchesByDivision = new Map<string, typeof matches>();
  const groupAssignments = new Map<string, Map<string, string>>();
  const groupOrderMap = new Map<string, string[]>();

  (matches ?? []).forEach((match) => {
    const divisionId = match.division_id as string;
    if (!matchesByDivision.has(divisionId)) {
      matchesByDivision.set(divisionId, []);
    }
    matchesByDivision.get(divisionId)?.push(match);
  });

  for (const divisionId of divisionIds) {
    const divisionMatches = matchesByDivision.get(divisionId) ?? [];
    const groupMatches = divisionMatches.filter((match) => match.group_id);
    const matchesByGroup = new Map<string, typeof groupMatches>();
    const groupOrders = new Map<string, number>();
    let missingGroupCount = 0;

    groupMatches.forEach((match) => {
      const groupMeta = match.groups as { name: string; order: number } | null;
      const groupName = groupMeta?.name ?? null;
      if (!groupName) {
        missingGroupCount += 1;
        return;
      }
      const groupOrder = groupMeta?.order ?? 999;
      if (!matchesByGroup.has(groupName)) matchesByGroup.set(groupName, []);
      matchesByGroup.get(groupName)?.push(match);
      const existingOrder = groupOrders.get(groupName);
      if (existingOrder === undefined || groupOrder < existingOrder) {
        groupOrders.set(groupName, groupOrder);
      }
    });

    if (groupMatches.length > 0 && missingGroupCount > 0) {
      return { ok: false, error: "조 정보를 확인할 수 없습니다." };
    }

    const orderedGroupKeys = [...matchesByGroup.keys()].sort((a, b) => {
      const orderA = groupOrders.get(a) ?? 999;
      const orderB = groupOrders.get(b) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
    groupOrderMap.set(divisionId, orderedGroupKeys);

    const assignment = new Map<string, string>();
    orderedGroupKeys.forEach((groupKey, index) => {
      const courtId = courtOrder[index % courtOrder.length] ?? null;
      if (courtId) assignment.set(groupKey, courtId);
    });
    groupAssignments.set(divisionId, assignment);
  }

  const roundOrder = [
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "final",
    "third_place",
  ];
  const roundIndex = new Map(roundOrder.map((round, index) => [round, index]));
  const tournamentMatchesByCourt = new Map<string, typeof matches>();
  let tournamentCourtIndex = 0;
  const tournamentMatches = (matches ?? [])
    .filter((match) => !match.group_id)
    .sort((a, b) => {
      const divisionA = a.division_id as string;
      const divisionB = b.division_id as string;
      const divisionOrderA = divisionOrder.get(divisionA) ?? 999;
      const divisionOrderB = divisionOrder.get(divisionB) ?? 999;
      if (divisionOrderA !== divisionOrderB) return divisionOrderA - divisionOrderB;
      const roundA = roundIndex.get((a.round as string | null) ?? "") ?? 999;
      const roundB = roundIndex.get((b.round as string | null) ?? "") ?? 999;
      if (roundA !== roundB) return roundA - roundB;
      return new Date(a.created_at as string).getTime() -
        new Date(b.created_at as string).getTime();
    });

  tournamentMatches.forEach((match) => {
    let resolvedCourtId = match.court_id as string | null;
    const round = (match.round as string | null) ?? null;
    if (!resolvedCourtId && courtOrder.length > 0) {
      resolvedCourtId =
        courtOrder[tournamentCourtIndex % courtOrder.length] ?? null;
      tournamentCourtIndex += 1;
    }
    const courtKey = resolvedCourtId ?? "__unassigned__";
    if (!tournamentMatchesByCourt.has(courtKey)) {
      tournamentMatchesByCourt.set(courtKey, []);
    }
    tournamentMatchesByCourt.get(courtKey)?.push(match);
  });

  const courtCursors = new Map<string, Date>();
  const courtSortOrders = new Map<string, number>();

  for (const courtId of courtOrder) {
    const courtKey = courtId ?? "__unassigned__";
    for (const divisionId of divisionIds) {
      const divisionMatches = matchesByDivision.get(divisionId) ?? [];
      const groupMatches = divisionMatches.filter((match) => match.group_id);
      const matchesByGroup = new Map<string, typeof groupMatches>();

      groupMatches.forEach((match) => {
        const groupName =
          (match.groups as { name: string; order: number } | null)?.name ?? null;
        if (!groupName) return;
        if (!matchesByGroup.has(groupName)) matchesByGroup.set(groupName, []);
        matchesByGroup.get(groupName)?.push(match);
      });

      const orderedGroupKeys = groupOrderMap.get(divisionId) ?? [];
      const assignment = groupAssignments.get(divisionId) ?? new Map();
      const courtGroupKeys = orderedGroupKeys.filter(
        (groupKey) => assignment.get(groupKey) === courtId
      );

      const courtSortOrder = courtSortOrders.get(courtKey) ?? 0;
      let currentCourtOrder = courtSortOrder;
      let hasGroupSlots = false;
      let hasTournamentSlots = false;
      for (const groupKey of courtGroupKeys) {
        const groupList = matchesByGroup.get(groupKey) ?? [];
        for (const match of groupList) {
          const cursor = courtCursors.get(courtKey) ?? new Date(startDate);
          const startAt = new Date(cursor);
          const endAt = new Date(
            startAt.getTime() + matchDurationMinutes * 60 * 1000
          );
          courtCursors.set(courtKey, endAt);

          slotsToInsert.push({
            tournament_id: tournamentId,
            division_id: divisionId,
            slot_type: "match",
            stage_type: "group",
            match_id: match.id as string,
            label: null,
            court_id: courtId,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            sort_order: currentCourtOrder,
          });
          currentCourtOrder += 1;
          hasGroupSlots = true;
        }
      }

      const tournamentMatches =
        tournamentMatchesByCourt.get(courtKey)?.filter(
          (match) => match.division_id === divisionId
        ) ?? [];

      for (const match of tournamentMatches) {
        const cursor = courtCursors.get(courtKey) ?? new Date(startDate);
        const startAt = new Date(cursor);
        const endAt = new Date(
          startAt.getTime() + matchDurationMinutes * 60 * 1000
        );
        courtCursors.set(courtKey, endAt);

        slotsToInsert.push({
          tournament_id: tournamentId,
          division_id: divisionId,
          slot_type: "match",
          stage_type: "tournament",
          match_id: match.id as string,
          label: null,
          court_id: courtId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          sort_order: currentCourtOrder,
        });
        currentCourtOrder += 1;
        hasTournamentSlots = true;
      }

      if (hasGroupSlots || hasTournamentSlots) {
        const stageTypeForBreak = hasTournamentSlots ? "tournament" : "group";
        const cursor = courtCursors.get(courtKey) ?? new Date(startDate);
        const startAt = new Date(cursor);
        const endAt = new Date(
          startAt.getTime() + breakDurationMinutes * 60 * 1000
        );
        courtCursors.set(courtKey, endAt);

        slotsToInsert.push({
          tournament_id: tournamentId,
          division_id: divisionId,
          slot_type: "break",
          stage_type: stageTypeForBreak,
          match_id: null,
          label: "휴식시간",
          court_id: courtId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          sort_order: currentCourtOrder,
        });
        currentCourtOrder += 1;
      }

      courtSortOrders.set(courtKey, currentCourtOrder);
    }
  }

  if (slotsToInsert.length === 0) {
    return { ok: false, error: "생성할 슬롯이 없습니다." };
  }

  const { error: insertErr } = await supabase
    .from("schedule_slots")
    .insert(slotsToInsert);

  if (insertErr) return { ok: false, error: insertErr.message };

  return { ok: true };
}

export async function clearGeneratedScheduleSlots(input: {
  tournamentId: string;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId } = input;
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("schedule_slots")
    .delete()
    .eq("tournament_id", tournamentId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function seedTournamentMatchSlotsFromBracket(input: {
  tournamentId: string;
  divisionId: string;
  assignToTournament: boolean;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, divisionId, assignToTournament } = input;
  if (!tournamentId || !divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const divisionResult = await getDivision(tournamentId, divisionId);
  if (!divisionResult.ok) return divisionResult;

  const existingSlots = await getScheduleSlotsByStage(
    tournamentId,
    divisionId,
    "tournament"
  );
  if (existingSlots > 0) {
    return { ok: false, error: "이미 토너먼트 슬롯이 존재합니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id")
    .eq("division_id", divisionId)
    .is("group_id", null)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!matches || matches.length === 0) {
    return { ok: false, error: "토너먼트 경기가 없습니다." };
  }

  const nextOrder = await getNextSortOrder(
    tournamentId,
    divisionId,
    "tournament"
  );

  const slotsToInsert = matches.map((match, index) => ({
    tournament_id: tournamentId,
    division_id: divisionId,
    slot_type: "match",
    stage_type: "tournament",
    match_id: assignToTournament ? match.id : null,
    label: null,
    court_id: null,
    start_at: null,
    end_at: null,
    sort_order: nextOrder + index,
  }));

  const { error: slotErr } = await supabase
    .from("schedule_slots")
    .insert(slotsToInsert);

  if (slotErr) return { ok: false, error: slotErr.message };

  return { ok: true };
}

async function updateSlotSortOrders(
  orderedSlotIds: string[]
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  for (const [index, slotId] of orderedSlotIds.entries()) {
    const { error } = await supabase
      .from("schedule_slots")
      .update({ sort_order: index })
      .eq("id", slotId);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function getGroupSlotsByDivision(divisionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_slots")
    .select(
      "id,slot_type,stage_type,label,matches!schedule_slots_match_id_fkey(id,groups(name))"
    )
    .eq("division_id", divisionId)
    .eq("stage_type", "group");

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []).map((row) => {
    const match = row.matches as { groups: { name: string } | null } | null;
    const groupKey =
      match?.groups?.name ??
      (row.slot_type !== "match"
        ? parseGroupKeyFromLabel(row.label as string | null)
        : null);
    return {
      id: row.id as string,
      group_key: groupKey ?? "미지정 조",
    };
  });

  return { data: rows, error: null };
}

export async function reorderGroupSlots(input: {
  divisionId: string;
  groupKey: string;
  orderedSlotIds: string[];
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { divisionId, groupKey, orderedSlotIds } = input;
  if (!divisionId || !groupKey) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!orderedSlotIds.length) {
    return { ok: false, error: "변경할 슬롯이 없습니다." };
  }

  const groupSlotsResult = await getGroupSlotsByDivision(divisionId);
  if (groupSlotsResult.error) {
    return { ok: false, error: groupSlotsResult.error };
  }

  const groupSlotIds = (groupSlotsResult.data ?? [])
    .filter((slot) => slot.group_key === groupKey)
    .map((slot) => slot.id);

  if (groupSlotIds.length === 0) {
    return { ok: false, error: "해당 그룹 슬롯이 없습니다." };
  }

  const slotIdSet = new Set(groupSlotIds);
  const orderedIdSet = new Set(orderedSlotIds);

  if (orderedSlotIds.length !== groupSlotIds.length) {
    return { ok: false, error: "슬롯 순서가 올바르지 않습니다." };
  }

  if (orderedIdSet.size !== orderedSlotIds.length) {
    return { ok: false, error: "슬롯 순서가 올바르지 않습니다." };
  }

  for (const slotId of orderedSlotIds) {
    if (!slotIdSet.has(slotId)) {
      return { ok: false, error: "슬롯 순서가 올바르지 않습니다." };
    }
  }

  return updateSlotSortOrders(orderedSlotIds);
}

export async function reorderTournamentSlots(input: {
  divisionId: string;
  orderedSlotIds: string[];
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { divisionId, orderedSlotIds } = input;
  if (!divisionId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (!orderedSlotIds.length) {
    return { ok: false, error: "변경할 슬롯이 없습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_slots")
    .select("id")
    .eq("division_id", divisionId)
    .eq("stage_type", "tournament");

  if (error) return { ok: false, error: error.message };

  const slotIds = (data ?? []).map((slot) => slot.id as string);
  if (slotIds.length === 0) {
    return { ok: false, error: "토너먼트 슬롯이 없습니다." };
  }

  const slotIdSet = new Set(slotIds);
  const orderedIdSet = new Set(orderedSlotIds);

  if (orderedSlotIds.length !== slotIds.length) {
    return { ok: false, error: "슬롯 순서가 올바르지 않습니다." };
  }

  if (orderedIdSet.size !== orderedSlotIds.length) {
    return { ok: false, error: "슬롯 순서가 올바르지 않습니다." };
  }

  for (const slotId of orderedSlotIds) {
    if (!slotIdSet.has(slotId)) {
      return { ok: false, error: "슬롯 순서가 올바르지 않습니다." };
    }
  }

  return updateSlotSortOrders(orderedSlotIds);
}

export async function updateSlotCourt(input: {
  tournamentId: string;
  slotId: string;
  courtId: string | null;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, slotId, courtId } = input;
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!slotId) return { ok: false, error: "슬롯 정보가 없습니다." };

  const supabase = await createSupabaseServerClient();

  const { data: slot, error: slotErr } = await supabase
    .from("schedule_slots")
    .select("id,tournament_id")
    .eq("id", slotId)
    .maybeSingle();

  if (slotErr) return { ok: false, error: slotErr.message };
  if (!slot) return { ok: false, error: "슬롯을 찾을 수 없습니다." };
  if (slot.tournament_id !== tournamentId) {
    return { ok: false, error: "슬롯이 대회에 속하지 않습니다." };
  }

  if (courtId) {
    const { data: court, error: courtErr } = await supabase
      .from("courts")
      .select("id")
      .eq("id", courtId)
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (courtErr) return { ok: false, error: courtErr.message };
    if (!court) return { ok: false, error: "코트를 찾을 수 없습니다." };
  }

  const { data, error } = await supabase
    .from("schedule_slots")
    .update({ court_id: courtId })
    .eq("id", slotId)
    .eq("tournament_id", tournamentId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "슬롯을 찾을 수 없습니다." };

  return { ok: true };
}

export async function swapSlotMatchAssignments(input: {
  sourceSlotId: string;
  targetSlotId: string;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { sourceSlotId, targetSlotId } = input;
  if (!sourceSlotId || !targetSlotId) {
    return { ok: false, error: "슬롯 정보를 확인할 수 없습니다." };
  }
  if (sourceSlotId === targetSlotId) {
    return { ok: false, error: "같은 슬롯입니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: slots, error } = await supabase
    .from("schedule_slots")
    .select("id,tournament_id,slot_type,match_id")
    .in("id", [sourceSlotId, targetSlotId]);

  if (error) return { ok: false, error: error.message };
  if (!slots || slots.length !== 2) {
    return { ok: false, error: "슬롯 정보를 확인할 수 없습니다." };
  }

  const source = slots.find((slot) => slot.id === sourceSlotId);
  const target = slots.find((slot) => slot.id === targetSlotId);
  if (!source || !target) {
    return { ok: false, error: "슬롯 정보를 확인할 수 없습니다." };
  }
  if (source.slot_type !== "match" || target.slot_type !== "match") {
    return { ok: false, error: "경기 슬롯만 교체할 수 있습니다." };
  }
  if (source.tournament_id !== target.tournament_id) {
    return { ok: false, error: "슬롯이 같은 대회에 속하지 않습니다." };
  }

  const sourceMatchId = source.match_id as string | null;
  const targetMatchId = target.match_id as string | null;

  const { error: sourceErr } = await supabase
    .from("schedule_slots")
    .update({ match_id: targetMatchId })
    .eq("id", sourceSlotId);

  if (sourceErr) return { ok: false, error: sourceErr.message };

  const { error: targetErr } = await supabase
    .from("schedule_slots")
    .update({ match_id: sourceMatchId })
    .eq("id", targetSlotId);

  if (targetErr) return { ok: false, error: targetErr.message };

  if (sourceMatchId) {
    const { error: matchErr } = await supabase
      .from("matches")
      .update({ slot_id: targetSlotId })
      .eq("id", sourceMatchId);
    if (matchErr) return { ok: false, error: matchErr.message };
  }

  if (targetMatchId) {
    const { error: matchErr } = await supabase
      .from("matches")
      .update({ slot_id: sourceSlotId })
      .eq("id", targetMatchId);
    if (matchErr) return { ok: false, error: matchErr.message };
  }

  return { ok: true };
}

export async function assignMatchToEmptySlot(input: {
  slotId: string;
  matchId: string;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { slotId, matchId } = input;
  if (!slotId || !matchId) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: slot, error: slotErr } = await supabase
    .from("schedule_slots")
    .select("id,tournament_id,slot_type,match_id")
    .eq("id", slotId)
    .maybeSingle();

  if (slotErr) return { ok: false, error: slotErr.message };
  if (!slot) return { ok: false, error: "슬롯을 찾을 수 없습니다." };
  if (slot.slot_type !== "match") {
    return { ok: false, error: "경기 슬롯만 배치할 수 있습니다." };
  }
  if (slot.match_id) {
    return { ok: false, error: "이미 경기 배정된 슬롯입니다." };
  }

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id,tournament_id,slot_id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchErr) return { ok: false, error: matchErr.message };
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." };
  if (match.tournament_id !== slot.tournament_id) {
    return { ok: false, error: "경기가 대회에 속하지 않습니다." };
  }

  if (match.slot_id && match.slot_id !== slotId) {
    const { error: clearErr } = await supabase
      .from("schedule_slots")
      .update({ match_id: null })
      .eq("id", match.slot_id);
    if (clearErr) return { ok: false, error: clearErr.message };
  }

  const { error: updateErr } = await supabase
    .from("schedule_slots")
    .update({ match_id: matchId })
    .eq("id", slotId);

  if (updateErr) return { ok: false, error: updateErr.message };

  const { error: matchUpdateErr } = await supabase
    .from("matches")
    .update({ slot_id: slotId })
    .eq("id", matchId);

  if (matchUpdateErr) return { ok: false, error: matchUpdateErr.message };

  return { ok: true };
}

export async function unassignMatchFromSlot(input: {
  slotId: string;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { slotId } = input;
  if (!slotId) return { ok: false, error: "슬롯 정보를 확인할 수 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { data: slot, error: slotErr } = await supabase
    .from("schedule_slots")
    .select("id,slot_type,match_id")
    .eq("id", slotId)
    .maybeSingle();

  if (slotErr) return { ok: false, error: slotErr.message };
  if (!slot) return { ok: false, error: "슬롯을 찾을 수 없습니다." };
  if (slot.slot_type !== "match") {
    return { ok: false, error: "경기 슬롯만 해제할 수 있습니다." };
  }

  const matchId = slot.match_id as string | null;

  const { error: updateErr } = await supabase
    .from("schedule_slots")
    .update({ match_id: null })
    .eq("id", slotId);

  if (updateErr) return { ok: false, error: updateErr.message };

  if (matchId) {
    const { error: matchErr } = await supabase
      .from("matches")
      .update({ slot_id: null })
      .eq("id", matchId);
    if (matchErr) return { ok: false, error: matchErr.message };
  }

  return { ok: true };
}

async function getScheduleSlotsByStage(
  tournamentId: string,
  divisionId: string,
  stageType: "group" | "tournament"
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("schedule_slots")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("division_id", divisionId)
    .eq("stage_type", stageType)
    .eq("slot_type", "match");

  if (error) return 0;
  return count ?? 0;
}

export async function generateScheduleTimes(input: {
  tournamentId: string;
  startTime: string;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const {
    tournamentId,
    startTime,
    matchDurationMinutes,
    breakDurationMinutes,
  } = input;

  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!startTime) return { ok: false, error: "시작 시간을 입력하세요." };
  if (!matchDurationMinutes || matchDurationMinutes <= 0) {
    return { ok: false, error: "경기 시간은 1분 이상이어야 합니다." };
  }
  if (breakDurationMinutes < 0) {
    return { ok: false, error: "휴식 시간은 0분 이상이어야 합니다." };
  }

  const startDate = new Date(startTime);
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: "시작 시간이 유효하지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: divisions, error: divisionsErr } = await supabase
    .from("divisions")
    .select("id,sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  if (divisionsErr) return { ok: false, error: divisionsErr.message };

  const divisionOrder = new Map(
    (divisions ?? []).map((division, index) => [division.id as string, index])
  );

  const { data: slots, error } = await supabase
    .from("schedule_slots")
    .select(
      "id,court_id,slot_type,sort_order,division_id,stage_type,label,matches!schedule_slots_match_id_fkey(groups(name,order))"
    )
    .eq("tournament_id", tournamentId)
    .not("court_id", "is", null)
    .order("court_id", { ascending: true })
    .order("division_id", { ascending: true })
    .order("stage_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!slots || slots.length === 0) {
    return { ok: false, error: "시간을 배정할 슬롯이 없습니다." };
  }

  const stageOrder = new Map([
    ["group", 0],
    ["tournament", 1],
  ]);

  const sortedSlots = (slots ?? [])
    .map((slot) => {
      const match = slot.matches as { groups: { name: string; order: number } | null } | null;
      const groupKey =
        slot.stage_type === "group"
          ? match?.groups?.name ?? parseGroupKeyFromLabel(slot.label ?? null)
          : null;
      const groupOrder =
        slot.stage_type === "group" ? match?.groups?.order ?? 999 : 999;
      return {
        slot,
        groupKey: groupKey ?? "",
        groupOrder,
        stageRank: stageOrder.get(slot.stage_type ?? "") ?? 2,
      };
    })
    .sort((a, b) => {
      const courtA = a.slot.court_id ?? "";
      const courtB = b.slot.court_id ?? "";
      if (courtA !== courtB) return courtA.localeCompare(courtB);
      const divA = a.slot.division_id ?? "";
      const divB = b.slot.division_id ?? "";
      if (divA !== divB) {
        const orderA = divisionOrder.get(divA) ?? 999;
        const orderB = divisionOrder.get(divB) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return divA.localeCompare(divB);
      }
      if (a.stageRank !== b.stageRank) return a.stageRank - b.stageRank;
      if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
      if (a.groupKey !== b.groupKey) return a.groupKey.localeCompare(b.groupKey);
      return (a.slot.sort_order ?? 0) - (b.slot.sort_order ?? 0);
    })
    .map((entry) => entry.slot);

  const courtOrder: string[] = [];
  const slotsByCourt = new Map<string, typeof sortedSlots>();

  sortedSlots.forEach((slot) => {
    const courtKey = slot.court_id ?? "__unassigned__";
    if (!slotsByCourt.has(courtKey)) {
      slotsByCourt.set(courtKey, []);
      courtOrder.push(courtKey);
    }
    slotsByCourt.get(courtKey)?.push(slot);
  });

  for (const courtKey of courtOrder) {
    const courtSlots = slotsByCourt.get(courtKey) ?? [];
    let cursor = new Date(startDate);

    for (const slot of courtSlots) {
      const durationMinutes =
        slot.slot_type === "break"
          ? breakDurationMinutes
          : matchDurationMinutes;

      const startAt = new Date(cursor);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

      const { error: updateErr } = await supabase
        .from("schedule_slots")
        .update({ start_at: startAt.toISOString(), end_at: endAt.toISOString() })
        .eq("id", slot.id);

      if (updateErr) return { ok: false, error: updateErr.message };

      cursor = endAt;
    }
  }

  return { ok: true };
}

export async function saveSchedule(
  tournamentId: string
): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { data: slots, error } = await supabase
    .from("schedule_slots")
    .select("id,slot_type,match_id,court_id,start_at")
    .eq("tournament_id", tournamentId)
    .eq("slot_type", "match")
    .not("match_id", "is", null);

  if (error) return { ok: false, error: error.message };
  if (!slots || slots.length === 0) {
    return { ok: false, error: "저장할 match 슬롯이 없습니다." };
  }

  const matchIds = slots
    .map((slot) => slot.match_id)
    .filter((id): id is string => Boolean(id));

  if (matchIds.length === 0) {
    return { ok: false, error: "저장할 match 슬롯이 없습니다." };
  }

  const { data: matches, error: matchErr } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .in("id", matchIds);

  if (matchErr) return { ok: false, error: matchErr.message };
  const matchSet = new Set((matches ?? []).map((match) => match.id as string));

  for (const slot of slots) {
    if (!slot.match_id) {
      return { ok: false, error: "슬롯에 match_id가 없습니다." };
    }
    if (!matchSet.has(slot.match_id)) {
      return { ok: false, error: "슬롯의 match가 대회에 속하지 않습니다." };
    }
    if (!slot.start_at) {
      return { ok: false, error: "슬롯에 시간이 없습니다." };
    }
    if (!slot.court_id) {
      return { ok: false, error: "슬롯에 코트가 없습니다." };
    }

    const { error: updateErr } = await supabase
      .from("matches")
      .update({
        slot_id: slot.id,
        scheduled_at: slot.start_at,
        court_id: slot.court_id,
      })
      .eq("id", slot.match_id);

    if (updateErr) return { ok: false, error: updateErr.message };
  }

  return { ok: true };
}

export async function syncScheduleToMatches(
  tournamentId: string
): Promise<ActionResult> {
  return saveSchedule(tournamentId);
}

export async function validateScheduleBeforeSync(
  tournamentId: string
): Promise<ScheduleValidationResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) {
    return { isValid: false, errors: [auth.error], warnings: [] };
  }

  if (!tournamentId) {
    return { isValid: false, errors: ["대회 정보가 없습니다."], warnings: [] };
  }

  const tournamentResult = await getTournament(tournamentId);
  if (!tournamentResult.ok) {
    return { isValid: false, errors: [tournamentResult.error], warnings: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data: slots, error } = await supabase
    .from("schedule_slots")
    .select(
      "id,slot_type,match_id,court_id,start_at,end_at,stage_type,division_id,label,sort_order,matches!schedule_slots_match_id_fkey(id,groups(name))"
    )
    .eq("tournament_id", tournamentId);

  if (error) {
    return { isValid: false, errors: [error.message], warnings: [] };
  }

  const rows = (slots ?? []) as {
    id: string;
    slot_type: string;
    match_id: string | null;
    court_id: string | null;
    start_at: string | null;
    end_at: string | null;
    stage_type: string | null;
    division_id: string | null;
    label: string | null;
    sort_order: number | null;
    matches: { id: string; groups: { name: string } | null } | null;
  }[];

  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    return {
      isValid: false,
      errors: ["동기화 가능한 스케줄 슬롯이 없습니다."],
      warnings,
    };
  }

  let missingMatchId = 0;
  let missingCourt = 0;
  let missingTime = 0;
  let invalidTime = 0;
  const matchUsage = new Map<string, number>();

  const overlapBuckets = new Map<
    string,
    { start: Date; end: Date; slotId: string }[]
  >();
  const sectionOrders = new Map<string, number[]>();

  rows.forEach((slot) => {
    const stageType = slot.stage_type ?? "unknown";
    const divisionId = slot.division_id ?? "unknown";
    const groupKey =
      stageType === "group"
        ? slot.matches?.groups?.name ?? parseGroupKeyFromLabel(slot.label)
        : null;
    const courtKey = slot.court_id ?? "unknown";
    const sectionKey = `court:${courtKey}`;

    const currentOrders = sectionOrders.get(sectionKey) ?? [];
    currentOrders.push(slot.sort_order ?? -1);
    sectionOrders.set(sectionKey, currentOrders);

    if (slot.slot_type === "match") {
      if (!slot.match_id) missingMatchId += 1;
      if (!slot.court_id) missingCourt += 1;
      if (!slot.start_at || !slot.end_at) {
        missingTime += 1;
      } else if (slot.start_at >= slot.end_at) {
        invalidTime += 1;
      }

      if (slot.match_id) {
        matchUsage.set(slot.match_id, (matchUsage.get(slot.match_id) ?? 0) + 1);
      }
    }

    if (slot.court_id && slot.start_at && slot.end_at) {
      const list = overlapBuckets.get(slot.court_id) ?? [];
      list.push({
        start: new Date(slot.start_at),
        end: new Date(slot.end_at),
        slotId: slot.id,
      });
      overlapBuckets.set(slot.court_id, list);
    }
  });

  let overlapCount = 0;
  overlapBuckets.forEach((list) => {
    const ordered = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
    let cursorEnd: Date | null = null;
    ordered.forEach((entry) => {
      if (cursorEnd && entry.start < cursorEnd) {
        overlapCount += 1;
      }
      if (!cursorEnd || entry.end > cursorEnd) {
        cursorEnd = entry.end;
      }
    });
  });

  const duplicateMatchCount = [...matchUsage.values()].filter((count) => count > 1)
    .length;

  let sortOrderIssueCount = 0;
  sectionOrders.forEach((values) => {
    const normalized = values.filter((value) => value >= 0);
    if (normalized.length === 0) return;
    const unique = new Set(normalized);
    const min = Math.min(...normalized);
    const max = Math.max(...normalized);
    const expectedMax = normalized.length - 1;
    const isContiguous =
      unique.size === normalized.length && min === 0 && max === expectedMax;
    if (!isContiguous) sortOrderIssueCount += 1;
  });

  if (missingMatchId > 0) {
    errors.push(`매치 미연결 슬롯 ${missingMatchId}건`);
  }
  if (missingCourt > 0) {
    errors.push(`코트 미배정 경기 ${missingCourt}건`);
  }
  if (missingTime > 0) {
    errors.push(`시간 미배정 경기 ${missingTime}건`);
  }
  if (invalidTime > 0) {
    errors.push(`시간 범위 오류 ${invalidTime}건`);
  }
  if (overlapCount > 0) {
    errors.push(`동일 코트 시간 충돌 ${overlapCount}건`);
  }
  if (duplicateMatchCount > 0) {
    errors.push(`중복 연결 경기 ${duplicateMatchCount}건`);
  }
  if (sortOrderIssueCount > 0) {
    errors.push(`정렬 오류 섹션 ${sortOrderIssueCount}건`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export async function clearSchedule(
  tournamentId: string
): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({ slot_id: null, scheduled_at: null, court_id: null })
    .eq("tournament_id", tournamentId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function clearScheduleSync(
  tournamentId: string
): Promise<ActionResult> {
  return clearSchedule(tournamentId);
}

export async function resetScheduleBoard(
  tournamentId: string
): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("schedule_slots")
    .delete()
    .eq("tournament_id", tournamentId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function regenerateScheduleBoard(input: {
  tournamentId: string;
  startTime: string;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { tournamentId, startTime, matchDurationMinutes, breakDurationMinutes } =
    input;
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!startTime) return { ok: false, error: "시작 시간을 입력하세요." };
  if (!matchDurationMinutes || matchDurationMinutes <= 0) {
    return { ok: false, error: "경기 시간은 1분 이상이어야 합니다." };
  }
  if (breakDurationMinutes < 0) {
    return { ok: false, error: "휴식 시간은 0분 이상이어야 합니다." };
  }

  const resetResult = await resetScheduleBoard(tournamentId);
  if (!resetResult.ok) return resetResult;

  return generateScheduleSlots({
    tournamentId,
    startTime,
    matchDurationMinutes,
    breakDurationMinutes,
  });
}
