import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export type ScheduleSlotRow = {
  id: string;
  tournament_id: string;
  division_id: string | null;
  court_id: string | null;
  slot_type:
    | "break"
    | "maintenance"
    | "buffer"
    | "match"
    | "tournament_placeholder";
  start_at: string;
  end_at: string;
  label: string | null;
  match_id: string | null;
  sort_order: number;
};

export async function listScheduleSlots(
  tournamentId: string
): Promise<{ data: ScheduleSlotRow[] | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_slots")
    .select(
      "id,tournament_id,division_id,court_id,slot_type,start_at,end_at,label,match_id,sort_order"
    )
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true })
    .order("start_at", { ascending: true });

  return {
    data: data as ScheduleSlotRow[] | null,
    error: error ? error.message : null,
  };
}

export async function createScheduleSlot(input: {
  tournamentId: string;
  slotType: "break" | "maintenance" | "buffer";
  startAt: string;
  endAt: string;
  label?: string;
}): Promise<ActionResult> {
  if (!input.tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!input.startAt || !input.endAt) {
    return { ok: false, error: "시간을 입력하세요." };
  }

  const start = new Date(input.startAt).getTime();
  const end = new Date(input.endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { ok: false, error: "종료 시간은 시작 시간 이후여야 합니다." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("schedule_slots")
    .select("sort_order")
    .eq("tournament_id", input.tournamentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("schedule_slots").insert({
    tournament_id: input.tournamentId,
    slot_type: input.slotType,
    start_at: input.startAt,
    end_at: input.endAt,
    label: input.label?.trim() || null,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateScheduleSlot(
  slotId: string,
  input: {
    startAt?: string;
    endAt?: string;
    label?: string | null;
  }
): Promise<ActionResult> {
  if (!slotId) return { ok: false, error: "슬롯 정보가 없습니다." };

  const payload: Record<string, unknown> = {};
  if (input.startAt !== undefined) payload.start_at = input.startAt;
  if (input.endAt !== undefined) payload.end_at = input.endAt;
  if (input.label !== undefined) payload.label = input.label;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("schedule_slots")
    .update(payload)
    .eq("id", slotId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
