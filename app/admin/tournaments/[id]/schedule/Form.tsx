"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { ScheduleMatchRow } from "@/lib/api/schedule";
import type { DivisionRow } from "@/lib/api/divisions";
import type { Court } from "@/lib/api/courts";
import {
  generateScheduleAction,
  bulkSaveScheduleAction,
} from "./actions";

/* ─── helpers ─── */

function formatTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Slot: fixed time, editable court, draggable match ─── */
type Slot = {
  index: number;
  scheduled_at: string | null;
  court_id: string | null;
  matchId: string;
};

function buildSlots(
  matches: ScheduleMatchRow[],
  courts: Court[]
): Slot[] {
  const courtOrderMap = new Map(
    courts.map((c) => [c.id, c.display_order ?? 999])
  );

  const sorted = [...matches].sort((a, b) => {
    const ta = a.scheduled_at ?? "";
    const tb = b.scheduled_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    const ca = courtOrderMap.get(a.court_id ?? "") ?? 999;
    const cb = courtOrderMap.get(b.court_id ?? "") ?? 999;
    return ca - cb;
  });

  return sorted.map((m, i) => ({
    index: i,
    scheduled_at: m.scheduled_at,
    court_id: m.court_id,
    matchId: m.id,
  }));
}

/* ─── Main form ─── */

type ScheduleFormProps = {
  tournamentId: string;
  initialMatches: ScheduleMatchRow[];
  divisions: DivisionRow[];
  courts: Court[];
};

export default function ScheduleForm({
  tournamentId,
  initialMatches,
  divisions,
  courts,
}: ScheduleFormProps) {
  // All slots (unfiltered, global state)
  const [allSlots, setAllSlots] = useState<Slot[]>(() =>
    buildSlots(initialMatches, courts)
  );
  const [savedSlots, setSavedSlots] = useState<Slot[]>(() =>
    buildSlots(initialMatches, courts)
  );

  // Filters
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedCourt, setSelectedCourt] = useState("");

  // Match metadata lookup (static)
  const matchMap = useMemo(() => {
    const map = new Map<string, ScheduleMatchRow>();
    initialMatches.forEach((m) => map.set(m.id, m));
    return map;
  }, [initialMatches]);

  // Court name lookup
  const courtNameMap = useMemo(
    () => new Map(courts.map((c) => [c.id, c.name])),
    [courts]
  );

  // Court display_order lookup
  const courtOrderMap = useMemo(
    () => new Map(courts.map((c) => [c.id, c.display_order ?? 999])),
    [courts]
  );

  // Visible slots (filtered + sorted by time then court display_order)
  const visibleSlots = useMemo(() => {
    let result = allSlots;
    if (selectedDivision) {
      result = result.filter((s) => {
        const match = matchMap.get(s.matchId);
        return match?.division_id === selectedDivision;
      });
    }
    if (selectedCourt) {
      result = result.filter((s) => s.court_id === selectedCourt);
    }
    return [...result].sort((a, b) => {
      const ta = a.scheduled_at ?? "";
      const tb = b.scheduled_at ?? "";
      if (ta !== tb) return ta.localeCompare(tb);
      const ca = courtOrderMap.get(a.court_id ?? "") ?? 999;
      const cb = courtOrderMap.get(b.court_id ?? "") ?? 999;
      return ca - cb;
    });
  }, [allSlots, selectedDivision, selectedCourt, matchMap, courtOrderMap]);

  // Dirty state (checks both matchId and court_id changes)
  const isDirty = useMemo(() => {
    if (allSlots.length !== savedSlots.length) return true;
    return allSlots.some(
      (s, i) =>
        s.matchId !== savedSlots[i].matchId ||
        s.court_id !== savedSlots[i].court_id
    );
  }, [allSlots, savedSlots]);

  // DnD state — tracks slot.index (stable ID in allSlots)
  const dragSlotIdx = useRef<number | null>(null);
  const [dragOverSlotIdx, setDragOverSlotIdx] = useState<number | null>(null);

  const handleDragStart = (slotIndex: number) => {
    dragSlotIdx.current = slotIndex;
  };

  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlotIdx(slotIndex);
  };

  const handleDragLeave = () => {
    setDragOverSlotIdx(null);
  };

  const handleDrop = (targetSlotIndex: number) => {
    const sourceSlotIndex = dragSlotIdx.current;
    if (sourceSlotIndex === null || sourceSlotIndex === targetSlotIndex) {
      dragSlotIdx.current = null;
      setDragOverSlotIdx(null);
      return;
    }

    setAllSlots((prev) => {
      const next = [...prev];
      const srcPos = next.findIndex((s) => s.index === sourceSlotIndex);
      const tgtPos = next.findIndex((s) => s.index === targetSlotIndex);
      if (srcPos === -1 || tgtPos === -1) return prev;

      const srcMatchId = next[srcPos].matchId;
      next[srcPos] = { ...next[srcPos], matchId: next[tgtPos].matchId };
      next[tgtPos] = { ...next[tgtPos], matchId: srcMatchId };
      return next;
    });

    dragSlotIdx.current = null;
    setDragOverSlotIdx(null);
  };

  // Court change handler
  const handleCourtChange = (slotIndex: number, newCourtId: string) => {
    setAllSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? { ...s, court_id: newCourtId || null }
          : s
      )
    );
  };

  const handleReset = () => {
    setAllSlots(savedSlots.map((s) => ({ ...s })));
  };

  // Bulk save
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const handleBulkSave = () => {
    setSaveError(null);
    setSaveSuccess(null);

    // Compute changed matches by comparing current vs saved
    const savedMap = new Map(
      savedSlots.map((s) => [
        s.matchId,
        { scheduledAt: s.scheduled_at, courtId: s.court_id },
      ])
    );

    const updates = allSlots
      .map((s) => ({
        matchId: s.matchId,
        scheduledAt: s.scheduled_at,
        courtId: s.court_id,
      }))
      .filter((u) => {
        const saved = savedMap.get(u.matchId);
        return (
          !saved ||
          saved.scheduledAt !== u.scheduledAt ||
          saved.courtId !== u.courtId
        );
      });

    if (updates.length === 0) return;

    startSaveTransition(async () => {
      const result = await bulkSaveScheduleAction(tournamentId, updates);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSaveSuccess("저장되었습니다.");
      setSavedSlots(allSlots.map((s) => ({ ...s })));
      setTimeout(() => setSaveSuccess(null), 2000);
    });
  };

  // After auto-generate reload
  const handleAfterGenerate = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Auto-generate section */}
      <GenerateScheduleForm
        tournamentId={tournamentId}
        hasCourts={courts.length > 0}
        hasMatches={initialMatches.length > 0}
        onGenerated={handleAfterGenerate}
      />

      {/* Filters */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">필터</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Division
            </label>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
            >
              <option value="">전체</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">코트</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
            >
              <option value="">전체</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* DnD board */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">경기 배치</h2>
          {isDirty && (
            <Badge className="bg-amber-100 text-amber-700">변경됨</Badge>
          )}
        </div>

        {initialMatches.length === 0 ? (
          <p className="text-sm text-gray-500">
            등록된 경기가 없습니다. 먼저 조/경기를 생성하세요.
          </p>
        ) : courts.length === 0 ? (
          <p className="text-sm text-gray-500">
            코트를 먼저 추가하세요. (대회 수정 페이지 → Courts)
          </p>
        ) : visibleSlots.length === 0 ? (
          <p className="text-sm text-gray-500">
            필터 조건에 맞는 경기가 없습니다.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              경기 카드를 드래그하여 슬롯 순서를 변경하세요. 시간은 고정,
              코트는 변경 가능합니다.
            </p>
            <div className="space-y-4">
              {(() => {
                // Group slots by court, sorted by display_order
                const sortedCourts = [...courts].sort(
                  (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
                );
                // Include "미지정" group if any slots have no court
                const unassigned = visibleSlots.filter((s) => !s.court_id);
                const courtSections: {
                  id: string | null;
                  name: string;
                  slots: typeof visibleSlots;
                }[] = sortedCourts
                  .map((c) => ({
                    id: c.id as string | null,
                    name: c.name,
                    slots: visibleSlots
                      .filter((s) => s.court_id === c.id)
                      .sort((a, b) =>
                        (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")
                      ),
                  }))
                  .filter((section) => section.slots.length > 0);

                if (unassigned.length > 0) {
                  courtSections.push({
                    id: null,
                    name: "미지정",
                    slots: unassigned.sort((a, b) =>
                      (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")
                    ),
                  });
                }

                return courtSections.map((section) => (
                  <div key={section.id ?? "unassigned"}>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      🏀 {section.name}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {section.slots.length}경기
                      </span>
                    </h3>
                    <div className="space-y-1">
                      {section.slots.map((slot) => {
                        const match = matchMap.get(slot.matchId);
                        const teamA = match?.team_a?.team_name ?? "TBD";
                        const teamB = match?.team_b?.team_name ?? "TBD";
                        const divName = match?.divisions?.name ?? "";

                        return (
                          <div
                            key={slot.index}
                            className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                              dragOverSlotIdx === slot.index
                                ? "border-blue-400 bg-blue-50"
                                : "border-gray-200 bg-white"
                            }`}
                            onDragOver={(e) => handleDragOver(e, slot.index)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(slot.index)}
                          >
                            {/* Fixed time */}
                            <div className="w-24 shrink-0 text-xs text-gray-500">
                              {formatTime(slot.scheduled_at)}
                            </div>

                            {/* Draggable match card */}
                            <div
                              draggable
                              onDragStart={() => handleDragStart(slot.index)}
                              className="flex flex-1 cursor-grab items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm active:cursor-grabbing"
                            >
                              <span className="text-gray-400">☰</span>
                              <span className="font-medium">
                                {teamA} vs {teamB}
                              </span>
                              {divName && (
                                <Badge className="ml-1 text-xs">{divName}</Badge>
                              )}
                              {match?.round && (
                                <span className="text-xs text-gray-400">
                                  {match.round}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </Card>

      {/* Bulk save bar */}
      {allSlots.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button onClick={handleBulkSave} disabled={isSaving || !isDirty}>
              {isSaving ? "저장 중..." : "변경사항 저장"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={isSaving || !isDirty}
            >
              되돌리기
            </Button>
          </div>
          <div>
            {saveError && (
              <span className="text-sm text-red-600">{saveError}</span>
            )}
            {saveSuccess && (
              <span className="text-sm text-green-600">{saveSuccess}</span>
            )}
            {!isDirty && !saveSuccess && (
              <span className="text-sm text-gray-400">변경사항 없음</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Auto-generate form ─── */

function GenerateScheduleForm({
  tournamentId,
  hasCourts,
  hasMatches,
  onGenerated,
}: {
  tournamentId: string;
  hasCourts: boolean;
  hasMatches: boolean;
  onGenerated: () => void;
}) {
  const [startAt, setStartAt] = useState("");
  const [interval, setInterval] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!startAt) {
      setError("시작 시간을 입력하세요.");
      return;
    }
    if (interval < 1) {
      setError("경기 간격은 1분 이상이어야 합니다.");
      return;
    }

    if (!window.confirm("기존 스케줄을 덮어씁니다. 계속하시겠습니까?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const isoStart = new Date(startAt).toISOString();
      const result = await generateScheduleAction(
        tournamentId,
        isoStart,
        interval
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("스케줄이 생성되었습니다.");
      onGenerated();
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">스케줄 자동 생성</h2>

      {!hasCourts && (
        <p className="text-sm text-amber-600">
          코트를 먼저 추가하세요. (대회 수정 페이지 → Courts)
        </p>
      )}
      {!hasMatches && (
        <p className="text-sm text-amber-600">
          경기를 먼저 생성하세요. (조/경기 생성)
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            시작 시간
          </label>
          <input
            type="datetime-local"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            경기 간격 (분)
          </label>
          <input
            type="number"
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            min={1}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isPending || !hasCourts || !hasMatches}
        >
          {isPending ? "생성 중..." : "스케줄 자동 생성"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </Card>
  );
}
