import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listApprovedTeamsByDivision } from "@/lib/api/applications";
import { createGroups, createGroupTeams, createMatches } from "@/lib/api/bracket";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export type ScheduleSlotMatch = {
  id: string;
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
      "id,slot_type,stage_type,start_at,end_at,court_id,division_id,match_id,label,sort_order,divisions(id,name),courts(id,name),matches!schedule_slots_match_id_fkey(id,score_a,score_b,group_id,groups(name,order),team_a:teams!matches_team_a_id_fkey(team_name),team_b:teams!matches_team_b_id_fkey(team_name))"
    )
    .eq("tournament_id", tournamentId)
    .order("court_id", { ascending: true })
    .order("division_id", { ascending: true })
    .order("stage_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("start_at", { ascending: true });

  if (error) return { data: null, error: error.message };

  const slots = (data ?? []) as Record<string, unknown>[];
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
        ? parseGroupKeyFromLabel(row.label as string | null)
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
      const matchEntries = [] as {
        tournament_id: string;
        division_id: string;
        group_id: string | null;
        round: string | null;
        team_a_id: string;
        team_b_id: string;
        status: string;
        court_id: string | null;
      }[];

      for (let i = 0; i < selected.length; i += 2) {
        matchEntries.push({
          tournament_id: tournamentId,
          division_id: divisionId,
          group_id: null,
          round: "tournament",
          team_a_id: selected[i],
          team_b_id: selected[i + 1],
          status: "scheduled",
          court_id: null,
        });
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

  const totalSlots = tournamentSize - 1;
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
  slotId: string;
  courtId: string | null;
}): Promise<ActionResult> {
  const auth = await requireOrganizer();
  if (!auth.ok) return auth;

  const { slotId, courtId } = input;
  if (!slotId) return { ok: false, error: "슬롯 정보가 없습니다." };

  const supabase = await createSupabaseServerClient();

  if (courtId) {
    const { data: court, error: courtErr } = await supabase
      .from("courts")
      .select("id")
      .eq("id", courtId)
      .maybeSingle();

    if (courtErr) return { ok: false, error: courtErr.message };
    if (!court) return { ok: false, error: "코트를 찾을 수 없습니다." };
  }

  const { data, error } = await supabase
    .from("schedule_slots")
    .update({ court_id: courtId })
    .eq("id", slotId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "슬롯을 찾을 수 없습니다." };

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
      if (divA !== divB) return divA.localeCompare(divB);
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
