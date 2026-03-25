"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Card from "@/components/ui/Card";
import type { Court } from "@/lib/api/courts";
import type {
  ScheduleSlot,
  ScheduleSlotFlatCourtGroup,
  ScheduleSlotFlatDivisionGroup,
} from "@/lib/api/schedule-slots";
import {
  formatLeagueMatchLabel,
  formatTournamentMatchLabel,
  formatBreakLabel,
  formatTournamentCategoryLabel,
} from "@/lib/formatters/matchLabel";
import { buildTournamentRoundMetaByRound } from "@/lib/formatters/tournamentRoundMeta";
import type { TournamentRoundMeta } from "@/lib/formatters/tournamentRoundMeta";
import {
  getInitialRoundFromRoundMap,
  compareTournamentMatchOrder,
} from "@/lib/formatters/tournamentMatchOrder";
import {
  reorderCourtDivisionSlotsAction,
  updateSlotDurationAction,
  updateSlotCourtAction,
  deleteBreakSlotAction,
} from "../actions";

type Props = {
  groups: ScheduleSlotFlatCourtGroup[];
  courts: Court[];
  tournamentId: string;
  scheduleStartAt: string | null;
  isEditable?: boolean;
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type TournamentSlotMeta = TournamentRoundMeta;

function buildFlatTournamentSlotMeta(
  groups: ScheduleSlotFlatCourtGroup[]
): Map<string, TournamentSlotMeta> {
  const metaBySlotId = new Map<string, TournamentSlotMeta>();
  const divisionRoundBuckets = new Map<string, Map<string, ScheduleSlot[]>>();

  groups.forEach((courtGroup) => {
    courtGroup.divisions.forEach((divGroup) => {
      const divisionId = divGroup.division?.id ?? "__unassigned__";
      const bucket = divisionRoundBuckets.get(divisionId) ?? new Map<string, ScheduleSlot[]>();

      divGroup.slots.forEach((slot) => {
        if (slot.stage_type !== "tournament" || slot.slot_type !== "match") return;
        if (!slot.match) return;
        const key = slot.match.groupName ?? "tournament";
        bucket.set(key, [...(bucket.get(key) ?? []), slot]);
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
    metaById.forEach((meta, id) => metaBySlotId.set(id, meta));
  });

  return metaBySlotId;
}

function buildSlotCategory(
  slot: ScheduleSlot,
  roundIndex: number | null,
  roundTotal: number | null
): string {
  if (slot.slot_type !== "match") {
    if (slot.slot_type === "break") return "휴식";
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
  meta: TournamentSlotMeta | null
): string {
  if (slot.slot_type !== "match") {
    if (slot.label) return slot.label;
    if (slot.slot_type === "break") return formatBreakLabel();
    return "슬롯";
  }
  if (!slot.match) return "경기 미배정";

  const teamA = slot.match.team_a ?? "TBD";
  const teamB = slot.match.team_b ?? "TBD";

  if (slot.stage_type === "tournament") {
    return formatTournamentMatchLabel({
      groupName: slot.match.groupName,
      teamA,
      teamB,
      seedA: slot.match.seedA ?? null,
      seedB: slot.match.seedB ?? null,
      roundIndex: meta?.roundIndex ?? null,
      roundTotal: meta?.roundTotal ?? null,
      initialRound: meta?.initialRound ?? null,
      previousRoundTotal: meta?.previousRoundTotal ?? null,
    });
  }

  return formatLeagueMatchLabel({
    groupName: slot.group_key,
    teamA,
    teamB,
  });
}

type SortableSlotRowProps = {
  slot: ScheduleSlot;
  courts: Court[];
  tournamentId: string;
  isEditable: boolean;
  meta: TournamentSlotMeta | null;
};

function SortableSlotRow({
  slot,
  courts,
  tournamentId,
  isEditable,
  meta,
}: SortableSlotRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDurationBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!isEditable) return;
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value < 0) return;
    startTransition(async () => {
      await updateSlotDurationAction(tournamentId, slot.id, value);
      router.refresh();
    });
  };

  const handleCourtChange = (newCourtId: string) => {
    if (!isEditable) return;
    startTransition(async () => {
      await updateSlotCourtAction(tournamentId, slot.id, newCourtId || null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!isEditable) return;
    startTransition(async () => {
      await deleteBreakSlotAction(tournamentId, slot.id);
      router.refresh();
    });
  };

  const isBreak = slot.slot_type === "break";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b text-sm ${isDragging ? "bg-blue-50" : "hover:bg-gray-50"}`}
    >
      {/* DnD handle */}
      <td className="px-2 py-1 w-8">
        {isEditable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1"
            aria-label="드래그 핸들"
            suppressHydrationWarning
          >
            ⠿
          </button>
        )}
      </td>

      {/* 코트 */}
      <td className="px-2 py-1 w-20">
        {isEditable ? (
          <select
            className="w-full rounded border border-gray-300 px-1 py-0.5 text-xs"
            value={slot.court_id ?? ""}
            onChange={(e) => handleCourtChange(e.target.value)}
            disabled={isPending}
          >
            <option value="">미배정</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-600">
            {courts.find((c) => c.id === slot.court_id)?.name ?? "-"}
          </span>
        )}
      </td>

      {/* 유형 — 읽기전용 */}
      <td className="px-2 py-1 w-20">
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            isBreak
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {isBreak
            ? "휴식"
            : slot.stage_type === "tournament"
              ? "토너먼트"
              : "조별"}
        </span>
      </td>

      {/* 구분 */}
      <td className="px-2 py-1 w-18 text-xs text-gray-600">
        {buildSlotCategory(slot, meta?.roundIndex ?? null, meta?.roundTotal ?? null)}
      </td>

      {/* 시간 */}
      <td className="px-2 py-1 w-26 text-xs text-gray-600">
        {slot.start_at ? (
          <span>
            {formatTime(slot.start_at)} ~ {formatTime(slot.end_at)}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      {/* 소요시간 */}
      <td className="px-2 py-1 w-18">
        {isEditable ? (
          <input
            type="number"
            min={0}
            className="w-12 rounded border border-gray-300 px-1 py-0.5 text-xs"
            defaultValue={slot.duration_minutes ?? ""}
            onBlur={handleDurationBlur}
            disabled={isPending}
            placeholder="분"
          />
        ) : (
          <span className="text-xs text-gray-600">
            {slot.duration_minutes != null ? `${slot.duration_minutes}분` : "-"}
          </span>
        )}
      </td>

      {/* 경기 */}
      <td className="px-2 py-1 text-xs text-gray-700">
        {buildMatchLabel(slot, meta)}
      </td>

      {/* 삭제 (break only) */}
      <td className="px-2 py-1 w-12">
        {isEditable && isBreak && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </td>
    </tr>
  );
}

type FlatScheduleTableProps = {
  slots: ScheduleSlot[];
  courts: Court[];
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  isEditable: boolean;
  metaBySlotId: Map<string, TournamentSlotMeta>;
};

function FlatScheduleTable({
  slots,
  courts,
  tournamentId,
  courtId,
  divisionId,
  isEditable,
  metaBySlotId,
}: FlatScheduleTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slots.findIndex((s) => s.id === active.id);
    const newIndex = slots.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(slots, oldIndex, newIndex);
    const orderedSlotIds = reordered.map((s) => s.id);

    startTransition(async () => {
      await reorderCourtDivisionSlotsAction(
        tournamentId,
        courtId,
        divisionId,
        orderedSlotIds
      );
      router.refresh();
    });
  };

  if (slots.length === 0) {
    return <p className="text-sm text-gray-400 py-2">슬롯이 없습니다.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={isEditable ? handleDragEnd : undefined}
    >
      <SortableContext
        items={slots.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <table className="w-full table-auto text-left">
          <thead>
            <tr className="border-b text-xs text-gray-500">
              {isEditable && <th className="px-2 py-1 w-8" />}
              <th className="px-2 py-1">코트</th>
              <th className="px-2 py-1">유형</th>
              <th className="px-2 py-1">구분</th>
              <th className="px-2 py-1">시간</th>
              <th className="px-2 py-1">소요(분)</th>
              <th className="px-2 py-1">경기</th>
              {isEditable && <th className="px-2 py-1" />}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <SortableSlotRow
                key={slot.id}
                slot={slot}
                courts={courts}
                tournamentId={tournamentId}
                isEditable={isEditable}
                meta={metaBySlotId.get(slot.id) ?? null}
              />
            ))}
          </tbody>
        </table>
      </SortableContext>
    </DndContext>
  );
}

type DivisionSectionProps = {
  divisionName: string | null;
  slots: ScheduleSlot[];
  courts: Court[];
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  isEditable: boolean;
  metaBySlotId: Map<string, TournamentSlotMeta>;
};

function DivisionSection({
  divisionName,
  slots,
  courts,
  tournamentId,
  courtId,
  divisionId,
  isEditable,
  metaBySlotId,
}: DivisionSectionProps) {
  return (
    <div className="space-y-1 pt-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-medium text-gray-700">
          {divisionName ?? "디비전 미배정"}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {slots.length}개
        </span>
      </div>
      <div className="overflow-x-auto">
        <FlatScheduleTable
          slots={slots}
          courts={courts}
          tournamentId={tournamentId}
          courtId={courtId}
          divisionId={divisionId}
          isEditable={isEditable}
          metaBySlotId={metaBySlotId}
        />
      </div>
    </div>
  );
}

type CourtCardProps = {
  courtName: string | null;
  courtId: string | null;
  divisions: ScheduleSlotFlatDivisionGroup[];
  courts: Court[];
  tournamentId: string;
  isEditable: boolean;
  metaBySlotId: Map<string, TournamentSlotMeta>;
};

function CourtCard({
  courtName,
  courtId,
  divisions,
  courts,
  tournamentId,
  isEditable,
  metaBySlotId,
}: CourtCardProps) {
  const totalSlots = divisions.reduce((sum, d) => sum + d.slots.length, 0);

  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          {courtName ?? "코트 미배정"}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          총 {totalSlots}개
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {divisions.map((divGroup) => {
          const divisionId = divGroup.division?.id ?? null;
          const divisionName = divGroup.division?.name ?? null;

          return (
            <DivisionSection
              key={divisionId ?? "none"}
              divisionName={divisionName}
              slots={divGroup.slots}
              courts={courts}
              tournamentId={tournamentId}
              courtId={courtId}
              divisionId={divisionId}
              isEditable={isEditable}
              metaBySlotId={metaBySlotId}
            />
          );
        })}
      </div>
    </Card>
  );
}

export default function ScheduleSlotsFlatBoard({
  groups,
  courts,
  tournamentId,
  isEditable = false,
}: Props) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-500">생성된 스케줄 이 없습니다.</p>
    );
  }

  const metaBySlotId = buildFlatTournamentSlotMeta(groups);

  return (
    <div className="space-y-4">
      {groups.map((courtGroup) => {
        const courtId = courtGroup.court?.id ?? null;
        const courtName = courtGroup.court?.name ?? null;

        return (
          <CourtCard
            key={courtId ?? "none"}
            courtName={`🏀 ${courtName}`}
            courtId={courtId}
            divisions={courtGroup.divisions}
            courts={courts}
            tournamentId={tournamentId}
            isEditable={isEditable}
            metaBySlotId={metaBySlotId}
          />
        );
      })}
    </div>
  );
}
