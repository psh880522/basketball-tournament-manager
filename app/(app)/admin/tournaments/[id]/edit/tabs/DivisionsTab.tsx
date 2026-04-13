"use client";

import { useState, useTransition } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import {
  TOURNAMENT_SIZE_LABELS,
  TOURNAMENT_SIZE_OPTIONS,
} from "@/lib/constants/tournament";
import type { DivisionRow } from "@/lib/api/divisions";
import type { DivisionApplicationCounts } from "@/lib/api/applications";
import {
  createDivisionAction,
  updateDivisionAction,
  deleteDivisionAction,
} from "../actions";

type DivisionsTabProps = {
  tournamentId: string;
  initialDivisions: DivisionRow[];
  applicationCounts: DivisionApplicationCounts[];
};

export default function DivisionsTab({
  tournamentId,
  initialDivisions,
  applicationCounts,
}: DivisionsTabProps) {
  const [divisions, setDivisions] = useState(initialDivisions);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const countsMap = new Map(applicationCounts.map((c) => [c.division_id, c]));

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">디비전</h2>
        <Button
          variant="secondary"
          onClick={() => {
            setShowAdd(true);
            setError(null);
          }}
        >
          + Division 추가
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showAdd && (
        <AddDivisionForm
          tournamentId={tournamentId}
          onCreated={(newDiv) => {
            setDivisions((prev) => [...prev, newDiv]);
            setShowAdd(false);
            setError(null);
          }}
          onCancel={() => setShowAdd(false)}
          onError={(msg) => setError(msg)}
        />
      )}

      {divisions.length === 0 ? (
        <EmptyState message="등록된 division이 없습니다." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {divisions.map((div) => (
            <DivisionItem
              key={div.id}
              division={div}
              tournamentId={tournamentId}
              counts={countsMap.get(div.id)}
              onUpdated={(updated) => {
                setDivisions((prev) =>
                  prev.map((d) => (d.id === updated.id ? updated : d))
                );
                setError(null);
              }}
              onDeleted={(id) => {
                setDivisions((prev) => prev.filter((d) => d.id !== id));
                setError(null);
              }}
              onError={(msg) => setError(msg)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function DivisionFields({
  name, setName,
  groupSize, setGroupSize,
  tournamentSize, setTournamentSize,
  entryFee, setEntryFee,
  capacity, setCapacity,
  isGroupSizeValid,
  isTournamentSizeValid,
  autoFocusName,
}: {
  name: string; setName: (v: string) => void;
  groupSize: number; setGroupSize: (v: number) => void;
  tournamentSize: string; setTournamentSize: (v: string) => void;
  entryFee: number; setEntryFee: (v: number) => void;
  capacity: string; setCapacity: (v: string) => void;
  isGroupSizeValid: boolean;
  isTournamentSizeValid: boolean;
  autoFocusName?: boolean;
}) {
  return (
    <div className="space-y-3">
      {/* 행 1: 이름 */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 남자부, 여자부"
          autoFocus={autoFocusName}
          required
        />
      </div>

      {/* 행 2: 그룹 크기 / 토너먼트 크기 / 참가비 / 정원 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            그룹 크기 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={2}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              isGroupSizeValid ? "border-gray-300" : "border-red-400"
            }`}
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
            required
          />
          {!isGroupSizeValid && (
            <p className="text-xs text-red-500">2 이상 입력</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">토너먼트 크기</label>
          <select
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              isTournamentSizeValid ? "border-gray-300" : "border-red-400"
            }`}
            value={tournamentSize}
            onChange={(e) => setTournamentSize(e.target.value)}
          >
            <option value="">미설정</option>
            {TOURNAMENT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {TOURNAMENT_SIZE_LABELS[size]}
              </option>
            ))}
          </select>
          {!isTournamentSizeValid && (
            <p className="text-xs text-red-500">올바른 크기 선택</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">참가비 (원)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={entryFee}
            onChange={(e) => setEntryFee(Number(e.target.value))}
            placeholder="0"
          />
          <FieldHint>0원이면 무료</FieldHint>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">정원</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="무제한"
          />
          <FieldHint>비워두면 무제한</FieldHint>
        </div>
      </div>
    </div>
  );
}

function AddDivisionForm({
  tournamentId,
  onCreated,
  onCancel,
  onError,
}: {
  tournamentId: string;
  onCreated: (div: DivisionRow) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [groupSize, setGroupSize] = useState<number>(4);
  const [tournamentSize, setTournamentSize] = useState<string>("");
  const [entryFee, setEntryFee] = useState<number>(0);
  const [capacity, setCapacity] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const isGroupSizeValid = typeof groupSize === "number" && groupSize >= 2;
  const tournamentSizeValue = tournamentSize.trim() ? Number(tournamentSize) : null;
  const isTournamentSizeValid =
    tournamentSizeValue === null ||
    (Number.isInteger(tournamentSizeValue) &&
      TOURNAMENT_SIZE_OPTIONS.includes(
        tournamentSizeValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
      ));
  const capacityValue = capacity.trim() ? Number(capacity) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isGroupSizeValid || !isTournamentSizeValid) return;

    startTransition(async () => {
      const result = await createDivisionAction(tournamentId, {
        name: name.trim(),
        groupSize,
        tournamentSize: isTournamentSizeValid ? tournamentSizeValue : null,
        entryFee,
        capacity: capacityValue,
      });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onCreated({
        id: result.id,
        tournament_id: tournamentId,
        name: name.trim(),
        group_size: groupSize,
        tournament_size: isTournamentSizeValid ? tournamentSizeValue : null,
        sort_order: result.sort_order,
        standings_dirty: false,
        entry_fee: entryFee,
        capacity: capacityValue,
      });
    });
  };

  return (
    <form
      className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
      onSubmit={handleSubmit}
    >
      <DivisionFields
        name={name} setName={setName}
        groupSize={groupSize} setGroupSize={setGroupSize}
        tournamentSize={tournamentSize} setTournamentSize={setTournamentSize}
        entryFee={entryFee} setEntryFee={setEntryFee}
        capacity={capacity} setCapacity={setCapacity}
        isGroupSizeValid={isGroupSizeValid}
        isTournamentSizeValid={isTournamentSizeValid}
        autoFocusName
      />
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={isPending || !isGroupSizeValid || !isTournamentSizeValid}
        >
          {isPending ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}

function DivisionItem({
  division,
  tournamentId,
  counts,
  onUpdated,
  onDeleted,
  onError,
}: {
  division: DivisionRow;
  tournamentId: string;
  counts: DivisionApplicationCounts | undefined;
  onUpdated: (div: DivisionRow) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState(division.name);
  const [groupSize, setGroupSize] = useState<number>(division.group_size ?? 4);
  const [tournamentSize, setTournamentSize] = useState<string>(
    division.tournament_size != null ? String(division.tournament_size) : ""
  );
  const [entryFee, setEntryFee] = useState<number>(division.entry_fee ?? 0);
  const [capacity, setCapacity] = useState<string>(
    division.capacity != null ? String(division.capacity) : ""
  );
  const [isPending, startTransition] = useTransition();

  const isGroupSizeValid = typeof groupSize === "number" && groupSize >= 2;
  const tournamentSizeValue = tournamentSize.trim() ? Number(tournamentSize) : null;
  const isTournamentSizeValid =
    tournamentSizeValue === null ||
    (Number.isInteger(tournamentSizeValue) &&
      TOURNAMENT_SIZE_OPTIONS.includes(
        tournamentSizeValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
      ));
  const capacityValue = capacity.trim() ? Number(capacity) : null;

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isGroupSizeValid || !isTournamentSizeValid) return;

    startTransition(async () => {
      const result = await updateDivisionAction(tournamentId, division.id, {
        name: name.trim(),
        groupSize,
        tournamentSize: isTournamentSizeValid ? tournamentSizeValue : null,
        entryFee,
        capacity: capacityValue,
      });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onUpdated({
        ...division,
        name: name.trim(),
        group_size: groupSize,
        tournament_size: isTournamentSizeValid ? tournamentSizeValue : null,
        entry_fee: entryFee,
        capacity: capacityValue,
      });
      setEditing(false);
    });
  };

  const doDelete = () => {
    setShowConfirm(false);
    startTransition(async () => {
      const result = await deleteDivisionAction(tournamentId, division.id);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDeleted(division.id);
    });
  };

  if (editing) {
    return (
      <li className="py-3">
        <form
          className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-4"
          onSubmit={handleUpdate}
        >
          <DivisionFields
            name={name} setName={setName}
            groupSize={groupSize} setGroupSize={setGroupSize}
            tournamentSize={tournamentSize} setTournamentSize={setTournamentSize}
            entryFee={entryFee} setEntryFee={setEntryFee}
            capacity={capacity} setCapacity={setCapacity}
            isGroupSizeValid={isGroupSizeValid}
            isTournamentSizeValid={isTournamentSizeValid}
            autoFocusName
          />
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={isPending || !isGroupSizeValid || !isTournamentSizeValid}
            >
              {isPending ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setName(division.name);
                setGroupSize(division.group_size ?? 4);
                setTournamentSize(
                  division.tournament_size != null ? String(division.tournament_size) : ""
                );
                setEntryFee(division.entry_fee ?? 0);
                setCapacity(division.capacity != null ? String(division.capacity) : "");
                setEditing(false);
              }}
            >
              취소
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          message={`"${division.name}" division을 삭제하시겠습니까?`}
          onConfirm={doDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <li className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold">{division.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              그룹 {division.group_size ?? "-"}팀
            </span>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              토너먼트 {division.tournament_size != null ? `${division.tournament_size}강` : "미설정"}
            </span>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              참가비 {(division.entry_fee ?? 0).toLocaleString()}원
            </span>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              정원 {division.capacity ?? "무제한"}
            </span>
          </div>
          <p className="text-xs text-blue-500">
            확정 {counts?.confirmed ?? 0}팀 / 대기 {counts?.waitlisted ?? 0}팀
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" onClick={() => setEditing(true)} disabled={isPending}>
            수정
          </Button>
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
          >
            {isPending ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </li>
    </>
  );
}
