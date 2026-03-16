"use client";

import { useState, useTransition } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type {
  ScheduleSlotCourtGroup,
  ScheduleSlot,
} from "@/lib/api/schedule-slots";
import type { Court } from "@/lib/api/courts";
import {
  reorderGroupSlotsAction,
  reorderTournamentSlotsAction,
  updateSlotCourtAction,
} from "../actions";

type Props = {
  slots: ScheduleSlotCourtGroup[] | null;
  error: string | null;
  courts: Court[];
  tournamentId: string;
  isEditable?: boolean;
};

type Message = { tone: "error"; text: string } | null;

type DragState = {
  sectionId: string;
  slotId: string;
} | null;

function formatTime(iso: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function renderMatch(slot: ScheduleSlot) {
  if (slot.slot_type !== "match") {
    if (slot.slot_type === "break") {
      return <span className="text-sm text-gray-600">휴식시간</span>;
    }
    return <span className="text-sm text-gray-600">{slot.slot_type}</span>;
  }

  if (!slot.match) {
    if (slot.stage_type === "tournament") {
      return <span className="text-sm text-gray-500">빈 경기</span>;
    }
    return <span className="text-sm text-gray-500">경기 없음</span>;
  }

  const teamA = slot.match.team_a ?? "TBD";
  const teamB = slot.match.team_b ?? "TBD";
  const scoreA = slot.match.score_a ?? "-";
  const scoreB = slot.match.score_b ?? "-";

  return (
    <span className="text-sm text-gray-700">
      {teamA} vs {teamB} ({scoreA}:{scoreB})
    </span>
  );
}

function buildSectionId(input: {
  courtId: string | null;
  divisionId: string | null;
  stageType: string | null;
  groupKey?: string | null;
}) {
  return [
    input.courtId ?? "__court__",
    input.divisionId ?? "__division__",
    input.stageType ?? "__stage__",
    input.groupKey ?? "__group__",
  ].join("::");
}

function reorderSlotIds(
  slots: ScheduleSlot[],
  draggedId: string,
  targetIndex: number
) {
  const ids = slots.map((slot) => slot.id);
  const fromIndex = ids.indexOf(draggedId);
  if (fromIndex === -1) return ids;
  ids.splice(fromIndex, 1);
  const insertIndex = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
  ids.splice(insertIndex, 0, draggedId);
  return ids;
}

function areIdsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export default function ScheduleSlotsBoard({
  slots,
  error,
  courts,
  tournamentId,
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
            {courtGroup.divisions.map((divisionGroup) => (
              <div
                key={divisionGroup.division?.id ?? "unassigned"}
                className="rounded border border-gray-100 bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {divisionGroup.division?.name ?? "미지정 디비전"}
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">
                      그룹 슬롯
                    </p>
                    {divisionGroup.groups.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        그룹 슬롯이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {divisionGroup.groups.map((group) => {
                          const divisionId = divisionGroup.division?.id ?? null;
                          const sectionId = buildSectionId({
                            courtId: courtGroup.court?.id ?? null,
                            divisionId,
                            stageType: "group",
                            groupKey: group.group_key,
                          });
                          const canEditSection =
                            isEditable && Boolean(divisionId) && !isPending;

                          return (
                            <div key={group.group_key} className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500">
                                {group.group_key}
                              </p>
                              {group.slots.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  슬롯이 없습니다.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {group.slots.map((slot, index) => (
                                    <SlotRow
                                      key={slot.id}
                                      slot={slot}
                                      courts={courts}
                                      isEditable={canEditSection}
                                      isPending={isPending}
                                      isDragging={dragState?.slotId === slot.id}
                                      updating={updatingSlotId === slot.id}
                                      onDragStart={(event) => {
                                        if (!canEditSection) return;
                                        event.dataTransfer.effectAllowed = "move";
                                        event.dataTransfer.setData("text/plain", slot.id);
                                        setDragState({ sectionId, slotId: slot.id });
                                      }}
                                      onDragEnd={() => setDragState(null)}
                                      onDragOver={(event) => {
                                        if (!canEditSection) return;
                                        if (!dragState || dragState.sectionId !== sectionId) {
                                          return;
                                        }
                                        event.preventDefault();
                                      }}
                                      onDrop={(event) => {
                                        if (!canEditSection) return;
                                        if (!dragState || dragState.sectionId !== sectionId) {
                                          return;
                                        }
                                        event.preventDefault();
                                        const originalIds = group.slots.map((s) => s.id);
                                        const orderedIds = reorderSlotIds(
                                          group.slots,
                                          dragState.slotId,
                                          index
                                        );
                                        setDragState(null);
                                        if (areIdsEqual(originalIds, orderedIds)) return;
                                        setMessage(null);
                                        startTransition(async () => {
                                          const resolvedDivisionId =
                                            divisionId ?? slot.division_id ?? "";
                                          if (!resolvedDivisionId) {
                                            setMessage({
                                              tone: "error",
                                              text: "디비전 정보를 확인할 수 없습니다.",
                                            });
                                            return;
                                          }
                                          const result = await reorderGroupSlotsAction(
                                            tournamentId,
                                            resolvedDivisionId,
                                            group.group_key,
                                            orderedIds
                                          );
                                          if (!result.ok) {
                                            setMessage({
                                              tone: "error",
                                              text: result.error,
                                            });
                                            return;
                                          }
                                          router.refresh();
                                        });
                                      }}
                                      onCourtChange={(value) => {
                                        if (!isEditable) return;
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
                                            setMessage({
                                              tone: "error",
                                              text: result.error,
                                            });
                                            return;
                                          }
                                          router.refresh();
                                        });
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">
                      토너먼트 슬롯
                    </p>
                    {divisionGroup.tournament_slots.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        토너먼트 슬롯이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {divisionGroup.tournament_slots.map((slot, index) => {
                          const divisionId = divisionGroup.division?.id ?? null;
                          const sectionId = buildSectionId({
                            courtId: courtGroup.court?.id ?? null,
                            divisionId,
                            stageType: "tournament",
                          });
                          const canEditSection =
                            isEditable && Boolean(divisionId) && !isPending;

                          return (
                            <SlotRow
                              key={slot.id}
                              slot={slot}
                              courts={courts}
                              isEditable={canEditSection}
                              isPending={isPending}
                              isDragging={dragState?.slotId === slot.id}
                              updating={updatingSlotId === slot.id}
                              onDragStart={(event) => {
                                if (!canEditSection) return;
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", slot.id);
                                setDragState({ sectionId, slotId: slot.id });
                              }}
                              onDragEnd={() => setDragState(null)}
                              onDragOver={(event) => {
                                if (!canEditSection) return;
                                if (!dragState || dragState.sectionId !== sectionId) {
                                  return;
                                }
                                event.preventDefault();
                              }}
                              onDrop={(event) => {
                                if (!canEditSection) return;
                                if (!dragState || dragState.sectionId !== sectionId) {
                                  return;
                                }
                                event.preventDefault();
                                const originalIds = divisionGroup.tournament_slots.map(
                                  (s) => s.id
                                );
                                const orderedIds = reorderSlotIds(
                                  divisionGroup.tournament_slots,
                                  dragState.slotId,
                                  index
                                );
                                setDragState(null);
                                if (areIdsEqual(originalIds, orderedIds)) return;
                                setMessage(null);
                                startTransition(async () => {
                                  const resolvedDivisionId =
                                    divisionId ?? slot.division_id ?? "";
                                  if (!resolvedDivisionId) {
                                    setMessage({
                                      tone: "error",
                                      text: "디비전 정보를 확인할 수 없습니다.",
                                    });
                                    return;
                                  }
                                  const result = await reorderTournamentSlotsAction(
                                    tournamentId,
                                    resolvedDivisionId,
                                    orderedIds
                                  );
                                  if (!result.ok) {
                                    setMessage({
                                      tone: "error",
                                      text: result.error,
                                    });
                                    return;
                                  }
                                  router.refresh();
                                });
                              }}
                              onCourtChange={(value) => {
                                if (!isEditable) return;
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
                                    setMessage({
                                      tone: "error",
                                      text: result.error,
                                    });
                                    return;
                                  }
                                  router.refresh();
                                });
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SlotRow({
  slot,
  courts,
  isEditable,
  isPending,
  isDragging,
  updating,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onCourtChange,
}: {
  slot: ScheduleSlot;
  courts: Court[];
  isEditable: boolean;
  isPending: boolean;
  isDragging: boolean;
  updating: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onCourtChange: (courtId: string | null) => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between ${
        isDragging ? "opacity-60" : ""
      }`}
      draggable={isEditable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge className="bg-gray-100 text-gray-700">{slot.slot_type}</Badge>
          {slot.slot_type === "match" && slot.label && (
            <span className="text-xs text-gray-500">{slot.label}</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
        </div>
        <div>{renderMatch(slot)}</div>
      </div>
      <div className="min-w-[160px]">
        <label className="block text-xs text-gray-500">코트</label>
        <select
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-600"
          value={slot.court_id ?? ""}
          disabled={!isEditable || isPending || updating}
          onChange={(event) => {
            const value = event.target.value;
            onCourtChange(value ? value : null);
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
      </div>
    </div>
  );
}
