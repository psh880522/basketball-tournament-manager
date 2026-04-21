"use client";

import { useState, useTransition } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import {
  assignMatchToEmptySlotAction,
  swapSlotMatchAssignmentsAction,
  updateSlotCourtAction,
} from "../actions";
import type { Court } from "@/lib/api/courts";
import type {
  ScheduleSlot,
  ScheduleSlotCourtGroup,
} from "@/lib/api/schedule-slots";
import {
  formatBreakLabel,
  formatLeagueMatchLabel,
  formatTournamentCategoryLabel,
  formatTournamentMatchLabel,
} from "@/lib/formatters/matchLabel";
import {
  buildTournamentRoundMetaByRound,
  type TournamentRoundMeta,
} from "@/lib/formatters/tournamentRoundMeta";
import {
  compareTournamentMatchOrder,
  getInitialRoundFromRoundMap,
} from "@/lib/formatters/tournamentMatchOrder";

type Message = { tone: "error"; text: string } | null;

type DragState = {
  sectionId: string;
  sourceSlotId: string;
  matchId: string;
} | null;

type TournamentSlotMeta = TournamentRoundMeta;

type Props = {
  slots: ScheduleSlotCourtGroup[] | null;
  error: string | null;
  courts: Court[];
  tournamentId: string;
  divisionRanks?: Record<string, Record<string, number>>;
  isEditable?: boolean;
};

function formatTimeOnly(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });
  return `${values.hour}:${values.minute}`;
}

function formatTimeRange(startAt: string | null, endAt: string | null) {
  const start = formatTimeOnly(startAt);
  const end = formatTimeOnly(endAt);
  if (!start && !end) return "미배정";
  if (start && !end) return `${start}~`;
  if (!start && end) return `~${end}`;
  return `${start}~${end}`;
}

function sortSlots(left: ScheduleSlot, right: ScheduleSlot) {
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

function buildSlotCategory(
  slot: ScheduleSlot,
  roundIndex: number | null,
  roundTotal: number | null
) {
  if (slot.slot_type !== "match") {
    if (slot.slot_type === "break") return "휴식";
    if (slot.slot_type === "maintenance") return "정비";
    if (slot.slot_type === "buffer") return "버퍼";
    return "슬롯";
  }

  if (slot.stage_type === "tournament") {
    return formatTournamentCategoryLabel(
      slot.match?.groupName ?? null,
      roundIndex,
      roundTotal
    );
  }

  return slot.group_key ?? "-";
}

function buildMatchLabel(
  slot: ScheduleSlot,
  divisionRanks: Record<string, Record<string, number>> | undefined,
  roundIndex: number | null,
  roundTotal: number | null,
  initialRound: string | null,
  previousRoundTotal: number | null
) {
  if (slot.slot_type !== "match") {
    if (slot.label) return slot.label;
    if (slot.slot_type === "break") return formatBreakLabel();
    if (slot.slot_type === "maintenance") return "정비 시간";
    if (slot.slot_type === "buffer") return "버퍼 시간";
    return "슬롯";
  }

  if (!slot.match) return "경기 미배정";

  const teamA = slot.match.team_a ?? "TBD";
  const teamB = slot.match.team_b ?? "TBD";

  if (slot.stage_type === "tournament") {
    const rankMap = slot.division_id ? divisionRanks?.[slot.division_id] : null;
    const seedA = slot.match.team_a_id
      ? rankMap?.[slot.match.team_a_id] ?? null
      : null;
    const seedB = slot.match.team_b_id
      ? rankMap?.[slot.match.team_b_id] ?? null
      : null;

    return formatTournamentMatchLabel({
      groupName: slot.match.groupName,
      teamA,
      teamB,
      seedA,
      seedB,
      roundIndex,
      roundTotal,
      initialRound,
      previousRoundTotal,
    });
  }

  return formatLeagueMatchLabel({
    groupName: slot.group_key,
    teamA,
    teamB,
  });
}

function buildSectionId(input: {
  courtId: string | null;
  divisionId: string | null;
  stageType: string | null;
}) {
  return [
    input.courtId ?? "__court__",
    input.divisionId ?? "__division__",
    input.stageType ?? "__stage__",
  ].join("::");
}

function buildTournamentSlotMeta(
  slots: ScheduleSlotCourtGroup[]
): Map<string, TournamentSlotMeta> {
  const metaBySlotId = new Map<string, TournamentSlotMeta>();
  const divisionRoundBuckets = new Map<string, Map<string, ScheduleSlot[]>>();

  slots.forEach((courtGroup) => {
    courtGroup.divisions.forEach((divisionGroup) => {
      const divisionId = divisionGroup.division?.id ?? "__unassigned__";
      const bucket = divisionRoundBuckets.get(divisionId) ?? new Map();

      divisionGroup.tournament_slots.forEach((slot) => {
        if (slot.stage_type !== "tournament" || slot.slot_type !== "match") return;
        if (!slot.match) return;
        const key = slot.match.groupName ?? "tournament";
        const list = bucket.get(key) ?? [];
        list.push(slot);
        bucket.set(key, list);
      });

      divisionRoundBuckets.set(divisionId, bucket);
    });
  });

  divisionRoundBuckets.forEach((roundBucket) => {
    const initialRound = getInitialRoundFromRoundMap(roundBucket);
    const metaById = buildTournamentRoundMetaByRound(roundBucket, {
      getId: (slot) => slot.id,
      sort: (left, right) =>
        compareTournamentMatchOrder(
          {
            id: left.id,
            groupName: left.match?.groupName ?? null,
            seedA: left.match?.seedA ?? null,
            seedB: left.match?.seedB ?? null,
            createdAt: null,
          },
          {
            id: right.id,
            groupName: right.match?.groupName ?? null,
            seedA: right.match?.seedA ?? null,
            seedB: right.match?.seedB ?? null,
            createdAt: null,
          },
          initialRound
        ),
    });

    metaById.forEach((meta, id) => {
      metaBySlotId.set(id, meta);
    });
  });

  return metaBySlotId;
}

export default function ScheduleSlotsBoard({
  slots,
  error,
  courts,
  tournamentId,
  divisionRanks,
  isEditable = false,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (error) {
    return <Card className="text-sm text-red-600">{error}</Card>;
  }

  if (!slots) {
    return <Card className="text-sm text-gray-500">슬롯을 불러오는 중...</Card>;
  }

  if (slots.length === 0) {
    return <Card className="text-sm text-gray-500">등록된 슬롯이 없습니다.</Card>;
  }

  const tournamentMetaBySlotId = buildTournamentSlotMeta(slots);

  return (
    <div className="space-y-4">
      {message && <Card className="text-sm text-red-600">{message.text}</Card>}
      {isPending && (
        <Card className="text-sm text-gray-500">변경사항을 저장하는 중...</Card>
      )}
      {slots.map((courtGroup) => (
        <Card key={courtGroup.court?.id ?? "unassigned"}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {courtGroup.court?.name ?? "미지정 코트"}
            </h3>
            <span className="text-xs text-gray-400">
              디비전 {courtGroup.divisions.length}
            </span>
          </div>

          <div className="space-y-4">
            {courtGroup.divisions.map((divisionGroup) => {
              const divisionId = divisionGroup.division?.id ?? null;
              const divisionLabel = divisionGroup.division?.name ?? "미지정 디비전";
              const leagueSlots = divisionGroup.groups
                .flatMap((group) => group.slots)
                .sort(sortSlots);
              const tournamentSlots = [...divisionGroup.tournament_slots].sort(sortSlots);

              return (
                <Card
                  key={divisionGroup.division?.id ?? "unassigned"}
                  className="bg-white"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {divisionLabel}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <ScheduleTable
                      title="리그"
                      slots={leagueSlots}
                      sectionId={buildSectionId({
                        courtId: courtGroup.court?.id ?? null,
                        divisionId,
                        stageType: "group",
                      })}
                      courts={courts}
                      tournamentMetaBySlotId={tournamentMetaBySlotId}
                      divisionRanks={divisionRanks}
                      isEditable={isEditable && Boolean(divisionId) && !isPending}
                      isPending={isPending}
                      dragState={dragState}
                      updatingSlotId={updatingSlotId}
                      onDragStart={(slot, event) => {
                        if (!slot.match) return;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", slot.id);
                        setDragState({
                          sectionId: buildSectionId({
                            courtId: courtGroup.court?.id ?? null,
                            divisionId,
                            stageType: "group",
                          }),
                          sourceSlotId: slot.id,
                          matchId: slot.match.id,
                        });
                      }}
                      onDragEnd={() => setDragState(null)}
                      onDrop={(slot) => {
                        if (!dragState) return;
                        if (slot.id === dragState.sourceSlotId) return;
                        setDragState(null);
                        setMessage(null);
                        startTransition(async () => {
                          const result = slot.match
                            ? await swapSlotMatchAssignmentsAction(
                                tournamentId,
                                dragState.sourceSlotId,
                                slot.id
                              )
                            : await assignMatchToEmptySlotAction(
                                tournamentId,
                                slot.id,
                                dragState.matchId
                              );
                          if (!result.ok) {
                            setMessage({ tone: "error", text: result.error });
                            return;
                          }
                          router.refresh();
                        });
                      }}
                      onCourtChange={(slot, value) => {
                        if ((value ?? "") === (slot.court_id ?? "")) return;
                        setMessage(null);
                        setUpdatingSlotId(slot.id);
                        startTransition(async () => {
                          const result = await updateSlotCourtAction(
                            tournamentId,
                            slot.id,
                            value
                          );
                          setUpdatingSlotId(null);
                          if (!result.ok) {
                            setMessage({ tone: "error", text: result.error });
                            return;
                          }
                          router.refresh();
                        });
                      }}
                    />

                    <ScheduleTable
                      title="토너먼트"
                      slots={tournamentSlots}
                      sectionId={buildSectionId({
                        courtId: courtGroup.court?.id ?? null,
                        divisionId,
                        stageType: "tournament",
                      })}
                      courts={courts}
                      tournamentMetaBySlotId={tournamentMetaBySlotId}
                      divisionRanks={divisionRanks}
                      isEditable={isEditable && Boolean(divisionId) && !isPending}
                      isPending={isPending}
                      dragState={dragState}
                      updatingSlotId={updatingSlotId}
                      onDragStart={(slot, event) => {
                        if (!slot.match) return;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", slot.id);
                        setDragState({
                          sectionId: buildSectionId({
                            courtId: courtGroup.court?.id ?? null,
                            divisionId,
                            stageType: "tournament",
                          }),
                          sourceSlotId: slot.id,
                          matchId: slot.match.id,
                        });
                      }}
                      onDragEnd={() => setDragState(null)}
                      onDrop={(slot) => {
                        if (!dragState) return;
                        if (slot.id === dragState.sourceSlotId) return;
                        setDragState(null);
                        setMessage(null);
                        startTransition(async () => {
                          const result = slot.match
                            ? await swapSlotMatchAssignmentsAction(
                                tournamentId,
                                dragState.sourceSlotId,
                                slot.id
                              )
                            : await assignMatchToEmptySlotAction(
                                tournamentId,
                                slot.id,
                                dragState.matchId
                              );
                          if (!result.ok) {
                            setMessage({ tone: "error", text: result.error });
                            return;
                          }
                          router.refresh();
                        });
                      }}
                      onCourtChange={(slot, value) => {
                        if ((value ?? "") === (slot.court_id ?? "")) return;
                        setMessage(null);
                        setUpdatingSlotId(slot.id);
                        startTransition(async () => {
                          const result = await updateSlotCourtAction(
                            tournamentId,
                            slot.id,
                            value
                          );
                          setUpdatingSlotId(null);
                          if (!result.ok) {
                            setMessage({ tone: "error", text: result.error });
                            return;
                          }
                          router.refresh();
                        });
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ScheduleTable({
  title,
  slots,
  sectionId,
  courts,
  tournamentMetaBySlotId,
  divisionRanks,
  isEditable,
  isPending,
  dragState,
  updatingSlotId,
  onDragStart,
  onDragEnd,
  onDrop,
  onCourtChange,
}: {
  title: string;
  slots: ScheduleSlot[];
  sectionId: string;
  courts: Court[];
  tournamentMetaBySlotId: Map<string, TournamentSlotMeta>;
  divisionRanks?: Record<string, Record<string, number>>;
  isEditable: boolean;
  isPending: boolean;
  dragState: DragState;
  updatingSlotId: string | null;
  onDragStart: (slot: ScheduleSlot, event: DragEvent<HTMLSpanElement>) => void;
  onDragEnd: () => void;
  onDrop: (slot: ScheduleSlot) => void;
  onCourtChange: (slot: ScheduleSlot, courtId: string | null) => void;
}) {
  const visibleSlots = slots.length === 0 ? [] : slots;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gray-500">{title}</p>
      {visibleSlots.length === 0 ? (
        <p className="text-xs text-gray-400">{title} 슬롯이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-auto" />
              <col className="w-28" />
            </colgroup>
            <thead className="border-b bg-white text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-3 py-2">시간</th>
                <th className="px-3 py-2">구분</th>
                <th className="px-3 py-2">경기</th>
                <th className="px-3 py-2">코트</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleSlots.map((slot) => {
                const canDragMatch =
                  isEditable && slot.slot_type === "match" && Boolean(slot.match);
                const isDragging = dragState?.sourceSlotId === slot.id;
                const updating = updatingSlotId === slot.id;
                const meta = tournamentMetaBySlotId.get(slot.id) ?? null;
                const roundIndex = meta?.roundIndex ?? null;
                const roundTotal = meta?.roundTotal ?? null;
                const previousRoundTotal = meta?.previousRoundTotal ?? null;
                const initialRound = meta?.initialRound ?? null;

                const label = buildMatchLabel(
                  slot,
                  divisionRanks,
                  roundIndex,
                  roundTotal,
                  initialRound,
                  previousRoundTotal
                );
                const category = buildSlotCategory(slot, roundIndex, roundTotal);
                const allowDrop =
                  isEditable &&
                  slot.slot_type === "match" &&
                  dragState &&
                  dragState.sectionId === sectionId;

                return (
                  <tr
                    key={slot.id}
                    className={`hover:bg-white ${isDragging ? "opacity-60" : ""}`}
                    onDragOver={(event) => {
                      if (!allowDrop) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      if (!allowDrop) return;
                      if (slot.id === dragState?.sourceSlotId) return;
                      event.preventDefault();
                      onDrop(slot);
                    }}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {formatTimeRange(slot.start_at, slot.end_at)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{category}</td>
                    <td className="px-3 py-2 text-gray-800 truncate" title={label}>
                      {canDragMatch ? (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-gray-700 ring-1 ring-gray-200 cursor-move"
                          draggable
                          onDragStart={(event) => onDragStart(slot, event)}
                          onDragEnd={onDragEnd}
                          title="드래그해서 다른 슬롯으로 이동"
                        >
                          <span className="text-xs text-gray-400">⠿</span>
                          {label}
                        </span>
                      ) : (
                        label
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-600"
                        value={slot.court_id ?? ""}
                        disabled={!isEditable || isPending || updating}
                        onChange={(event) => {
                          const value = event.target.value;
                          onCourtChange(slot, value ? value : null);
                        }}
                      >
                        <option value="">미지정</option>
                        {courts.map((court) => (
                          <option key={court.id} value={court.id}>
                            {court.name}
                          </option>
                        ))}
                      </select>
                      {updating ? (
                        <p className="mt-1 text-xs text-gray-400">저장 중...</p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}