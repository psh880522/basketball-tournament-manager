"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import {
  TOURNAMENT_SIZE_LABELS,
  TOURNAMENT_SIZE_OPTIONS,
} from "@/lib/constants/tournament";
import { type TournamentEditRow } from "@/lib/api/tournaments";
import type { DivisionRow } from "@/lib/api/divisions";
import type { Court } from "@/lib/api/courts";
import {
  updateTournamentAction,
  updateMaxTeamsAction,
  uploadPosterAction,
  deletePosterAction,
  createDivisionAction,
  updateDivisionAction,
  deleteDivisionAction,
  createCourtAction,
  updateCourtAction,
  deleteCourtAction,
} from "./actions";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

function toDateStr(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type TournamentEditFormProps = {
  tournament: TournamentEditRow;
};

export default function TournamentEditForm({
  tournament,
}: TournamentEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name ?? "");
  const [location, setLocation] = useState(tournament.location ?? "");
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: tournament.start_date ? new Date(tournament.start_date + "T00:00:00") : undefined,
    to: tournament.end_date ? new Date(tournament.end_date + "T00:00:00") : undefined,
  }));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState(tournament.description ?? "");
  const [startTime, setStartTime] = useState(() => {
    if (!tournament.schedule_start_at) return "";
    const kstMs =
      new Date(tournament.schedule_start_at).getTime() + 9 * 60 * 60 * 1000;
    return new Date(kstMs).toISOString().slice(11, 16);
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => {
      router.push("/admin");
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [router, success]);

  useEffect(() => {
    if (!calendarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(() => {
      updateTournamentAction({
        tournamentId: tournament.id,
        name: name.trim(),
        location: location.trim() ? location.trim() : null,
        start_date: toDateStr(dateRange.from),
        end_date: toDateStr(dateRange.to ?? dateRange.from),
        max_teams: tournament.max_teams,
        schedule_start_at: startTime
          ? new Date(`${toDateStr(dateRange.from)}T${startTime}:00+09:00`).toISOString()
          : null,
        description: description.trim() || null,
      }).then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSuccess("저장이 완료되었습니다. 목록으로 이동합니다.");
      });
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold">기본 정보</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium">대회명</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">장소</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="mb-1 text-sm font-medium">대회 날짜</p>
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <span>
                    {dateRange.from
                      ? `${toDateStr(dateRange.from)} ~ ${dateRange.to ? toDateStr(dateRange.to) : "종료일 선택"}`
                      : "날짜 선택"}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </button>
                {calendarOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range ?? { from: undefined, to: undefined });
                        if (range?.from && range?.to) setCalendarOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <FieldHint>시작일과 종료일을 선택하세요.</FieldHint>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">시작 시간</p>
              <input
                type="time"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <FieldHint>시작일 기준 스케줄 시간이 자동 계산됩니다. (선택)</FieldHint>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">설명</label>
          <textarea
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="공지사항, 규칙 등을 자유롭게 작성하세요."
          />
          <FieldHint>{description.length} / 2000자</FieldHint>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
          <Link href="/admin">
            <Button type="button" variant="secondary">
              취소
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}


/* ─────────────────── Divisions Section ─────────────────── */

type DivisionsSectionProps = {
  tournamentId: string;
  initialDivisions: DivisionRow[];
};

export function DivisionsSection({
  tournamentId,
  initialDivisions,
}: DivisionsSectionProps) {
  const [divisions, setDivisions] = useState(initialDivisions);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">디비전</h2>
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
        <p className="text-sm text-gray-500">등록된 division이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {divisions.map((div) => (
            <DivisionItem
              key={div.id}
              division={div}
              tournamentId={tournamentId}
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
  const [isPending, startTransition] = useTransition();

  const isGroupSizeValid = typeof groupSize === "number" && groupSize >= 2;
  const tournamentSizeValue = tournamentSize.trim()
    ? Number(tournamentSize)
    : null;
  const isTournamentSizeValid =
    tournamentSizeValue === null ||
    (Number.isInteger(tournamentSizeValue) &&
      TOURNAMENT_SIZE_OPTIONS.includes(
        tournamentSizeValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
      ));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isGroupSizeValid || !isTournamentSizeValid) return;

    startTransition(async () => {
      const result = await createDivisionAction(
        tournamentId,
        name.trim(),
        groupSize,
        isTournamentSizeValid ? tournamentSizeValue : null
      );
      if (!result.ok) {
        onError(result.error);
        return;
      }
      // Optimistic: create a temp row; real data will come from revalidation
      onCreated({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        name: name.trim(),
        group_size: groupSize,
        tournament_size: isTournamentSizeValid ? tournamentSizeValue : null,
        sort_order: 9999,
        standings_dirty: false,
      });
    });
  };

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
      onSubmit={handleSubmit}
    >
      <div className="flex-1 min-w-[120px] space-y-1">
        <label className="text-xs font-medium text-gray-600">이름</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 남자부, 여자부"
          autoFocus
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">그룹 크기</label>
        <input
          type="number"
          className={`w-20 rounded-md border px-2 py-2 text-sm ${
            !isGroupSizeValid ? "border-red-400" : "border-gray-300"
          }`}
          value={groupSize}
          onChange={(e) => setGroupSize(Number(e.target.value))}
          min={2}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">
          토너먼트 크기
        </label>
        <select
          className={`w-28 rounded-md border px-2 py-2 text-sm ${
            !isTournamentSizeValid ? "border-red-400" : "border-gray-300"
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
      </div>
      {!isGroupSizeValid && (
        <span className="text-xs text-red-500 self-center">2 이상 입력</span>
      )}
      {!isTournamentSizeValid && (
        <span className="text-xs text-red-500 self-center">
          올바른 토너먼트 크기를 선택하세요
        </span>
      )}
      <Button
        type="submit"
        disabled={isPending || !isGroupSizeValid || !isTournamentSizeValid}
      >
        {isPending ? "저장 중..." : "저장"}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        취소
      </Button>
    </form>
  );
}

/* Division item with inline edit */

function DivisionItem({
  division,
  tournamentId,
  onUpdated,
  onDeleted,
  onError,
}: {
  division: DivisionRow;
  tournamentId: string;
  onUpdated: (div: DivisionRow) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(division.name);
  const [groupSize, setGroupSize] = useState<number>(division.group_size ?? 4);
  const [tournamentSize, setTournamentSize] = useState<string>(
    division.tournament_size !== null && division.tournament_size !== undefined
      ? String(division.tournament_size)
      : ""
  );
  const [isPending, startTransition] = useTransition();

  const isGroupSizeValid = typeof groupSize === "number" && groupSize >= 2;
  const tournamentSizeValue = tournamentSize.trim()
    ? Number(tournamentSize)
    : null;
  const isTournamentSizeValid =
    tournamentSizeValue === null ||
    (Number.isInteger(tournamentSizeValue) &&
      TOURNAMENT_SIZE_OPTIONS.includes(
        tournamentSizeValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
      ));

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isGroupSizeValid || !isTournamentSizeValid) return;

    startTransition(async () => {
      const result = await updateDivisionAction(
        tournamentId,
        division.id,
        name.trim(),
        groupSize,
        isTournamentSizeValid ? tournamentSizeValue : null
      );
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onUpdated({
        ...division,
        name: name.trim(),
        group_size: groupSize,
        tournament_size: isTournamentSizeValid ? tournamentSizeValue : null,
      });
      setEditing(false);
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`"${division.name}" division을 삭제하시겠습니까?`)) {
      return;
    }

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
      <li className="py-2">
        <form className="flex flex-wrap items-center gap-2" onSubmit={handleUpdate}>
          <input
            className="flex-1 min-w-[120px] rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Division 이름"
            autoFocus
            required
          />
          <label className="flex items-center gap-1 text-sm text-gray-600">
            그룹 크기
            <input
              type="number"
              className={`w-20 rounded-md border px-2 py-1.5 text-sm ${
                !isGroupSizeValid ? "border-red-400" : "border-gray-300"
              }`}
              value={groupSize}
              onChange={(e) => setGroupSize(Number(e.target.value))}
              min={2}
              required
            />
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-600">
            토너먼트 크기
            <select
              className={`w-24 rounded-md border px-2 py-1.5 text-sm ${
                !isTournamentSizeValid ? "border-red-400" : "border-gray-300"
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
          </label>
          {!isGroupSizeValid && (
            <span className="text-xs text-red-500">2 이상 입력</span>
          )}
          {!isTournamentSizeValid && (
            <span className="text-xs text-red-500">
              올바른 토너먼트 크기를 선택하세요
            </span>
          )}
          <Button
            type="submit"
            disabled={
              isPending || !isGroupSizeValid || !isTournamentSizeValid
            }
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
                division.tournament_size !== null &&
                  division.tournament_size !== undefined
                  ? String(division.tournament_size)
                  : ""
              );
              setEditing(false);
            }}
          >
            취소
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{division.name}</p>
        <p className="text-xs text-gray-400">
          그룹 크기: {division.group_size ?? "-"} 토너먼트 크기:{" "}
          {division.tournament_size ?? "-"} 순서:{" "}
          {division.sort_order}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setEditing(true)}
          disabled={isPending}
        >
          수정
        </Button>
        <Button
          variant="ghost"
          className="text-red-600 hover:text-red-700"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "삭제 중..." : "삭제"}
        </Button>
      </div>
    </li>
  );
}

/* ─────────────────── Courts Section ─────────────────── */

type CourtsSectionProps = {
  tournamentId: string;
  initialCourts: Court[];
};

export function CourtsSection({
  tournamentId,
  initialCourts,
}: CourtsSectionProps) {
  const [courts, setCourts] = useState(initialCourts);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">코트</h2>
        <Button
          variant="secondary"
          onClick={() => {
            setShowAdd(true);
            setError(null);
          }}
        >
          + 코트 추가
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showAdd && (
        <AddCourtForm
          tournamentId={tournamentId}
          onCreated={(newCourt) => {
            setCourts((prev) => [...prev, newCourt]);
            setShowAdd(false);
            setError(null);
          }}
          onCancel={() => setShowAdd(false)}
          onError={(msg) => setError(msg)}
        />
      )}

      {courts.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 코트가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {courts.map((court) => (
            <CourtItem
              key={court.id}
              court={court}
              tournamentId={tournamentId}
              onUpdated={(updated) => {
                setCourts((prev) =>
                  prev.map((c) => (c.id === updated.id ? updated : c))
                );
                setError(null);
              }}
              onDeleted={(id) => {
                setCourts((prev) => prev.filter((c) => c.id !== id));
                setError(null);
              }}
              onError={(msg) => setError(msg)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddCourtForm({
  tournamentId,
  onCreated,
  onCancel,
  onError,
}: {
  tournamentId: string;
  onCreated: (court: Court) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await createCourtAction(tournamentId, name.trim());
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onCreated({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        name: name.trim(),
        display_order: 9999,
      });
    });
  };

  return (
    <form
      className="flex items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
      onSubmit={handleSubmit}
    >
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-gray-600">코트명</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: A코트, 1번 코트"
          autoFocus
          required
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        취소
      </Button>
    </form>
  );
}

/* Court item */

function CourtItem({
  court,
  tournamentId,
  onUpdated,
  onDeleted,
  onError,
}: {
  court: Court;
  tournamentId: string;
  onUpdated: (court: Court) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(court.name);
  const [displayOrder, setDisplayOrder] = useState<number>(court.display_order ?? 0);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await updateCourtAction(
        tournamentId,
        court.id,
        name.trim(),
        displayOrder
      );
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onUpdated({ ...court, name: name.trim(), display_order: displayOrder });
      setEditing(false);
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`"${court.name}" 코트를 삭제하시겠습니까?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCourtAction(tournamentId, court.id);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDeleted(court.id);
    });
  };

  if (editing) {
    return (
      <li className="py-2">
        <form className="flex flex-wrap items-center gap-2" onSubmit={handleUpdate}>
          <input
            className="flex-1 min-w-[120px] rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="코트 이름"
            autoFocus
            required
          />
          <label className="flex items-center gap-1 text-sm text-gray-600">
            순서
            <input
              type="number"
              className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              min={0}
            />
          </label>
          <Button type="submit" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setName(court.name);
              setDisplayOrder(court.display_order ?? 0);
              setEditing(false);
            }}
          >
            취소
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{court.name}</p>
        <p className="text-xs text-gray-400">
          순서: {court.display_order ?? "-"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setEditing(true)}
          disabled={isPending}
        >
          수정
        </Button>
        <Button
          variant="ghost"
          className="text-red-600 hover:text-red-700"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "삭제 중..." : "삭제"}
        </Button>
      </div>
    </li>
  );
}

/* ───────────────── Settings Section ───────────────── */

type SettingsSectionProps = {
  tournamentId: string;
  initialMaxTeams: number | null;
  initialDivisions: DivisionRow[];
  initialCourts: Court[];
};

export function SettingsSection({
  tournamentId,
  initialMaxTeams,
  initialDivisions,
  initialCourts,
}: SettingsSectionProps) {
  const [maxTeams, setMaxTeams] = useState(
    initialMaxTeams ? String(initialMaxTeams) : ""
  );
  const [maxTeamsError, setMaxTeamsError] = useState<string | null>(null);
  const [maxTeamsSuccess, setMaxTeamsSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxTeamsValue = useMemo(() => {
    if (!maxTeams.trim()) return null;
    const parsed = Number(maxTeams);
    return Number.isFinite(parsed) ? parsed : null;
  }, [maxTeams]);

  const isMaxTeamsValid =
    maxTeamsValue === null ||
    (Number.isInteger(maxTeamsValue) && maxTeamsValue >= 2);

  const handleSaveMaxTeams = () => {
    if (!isMaxTeamsValid) return;
    setMaxTeamsError(null);
    setMaxTeamsSuccess(null);
    startTransition(async () => {
      const result = await updateMaxTeamsAction(tournamentId, maxTeamsValue);
      if (!result.ok) {
        setMaxTeamsError(result.error);
        return;
      }
      setMaxTeamsSuccess("저장됐습니다.");
      window.setTimeout(() => setMaxTeamsSuccess(null), 2000);
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold">설정</h2>

      {/* 최대 팀 수 */}
      <div className="space-y-1">
        <label className="text-sm font-medium">최대 팀 수</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={2}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              isMaxTeamsValid ? "border-gray-300" : "border-rose-400"
            }`}
            value={maxTeams}
            onChange={(event) => {
              setMaxTeams(event.target.value);
              setMaxTeamsSuccess(null);
            }}
            placeholder="예: 16"
          />
          <Button
            type="button"
            onClick={handleSaveMaxTeams}
            disabled={isPending || !isMaxTeamsValid}
          >
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
        <FieldHint>비워두면 제한 없이 등록됩니다.</FieldHint>
        {!isMaxTeamsValid && (
          <p className="text-sm text-red-600">
            최대 팀 수는 2 이상의 정수여야 합니다.
          </p>
        )}
        {maxTeamsError && (
          <p className="text-sm text-red-600">{maxTeamsError}</p>
        )}
        {maxTeamsSuccess && (
          <p className="text-sm text-green-600">{maxTeamsSuccess}</p>
        )}
      </div>

      {/* 디비전 */}
      <div className="pt-4">
        <DivisionsSection
          tournamentId={tournamentId}
          initialDivisions={initialDivisions}
        />
      </div>

      {/* 코트 */}
      <div className="pt-4">
        <CourtsSection
          tournamentId={tournamentId}
          initialCourts={initialCourts}
        />
      </div>
    </Card>
  );
}

/* ───────────────── Poster Section ───────────────── */

type PosterSectionProps = {
  tournamentId: string;
  initialPosterUrl: string | null;
};

export function PosterSection({
  tournamentId,
  initialPosterUrl,
}: PosterSectionProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPosterUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("poster", selectedFile);

    startTransition(async () => {
      const result = await uploadPosterAction(tournamentId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosterUrl(result.posterUrl);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleDelete = () => {
    if (!window.confirm("포스터를 삭제하시겠습니까?")) return;

    startTransition(async () => {
      const result = await deletePosterAction(tournamentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosterUrl(null);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const displayUrl = preview ?? posterUrl;

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">포스터</h2>

      {displayUrl ? (
        <div className="relative mx-auto w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="대회 포스터"
            className="w-full rounded-md border border-gray-200 object-cover"
          />
        </div>
      ) : (
        <div className="mx-auto flex h-40 w-full max-w-xs items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
          포스터 없음
        </div>
      )}

      <div className="flex justify-center flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
        >
          이미지 선택
        </Button>
        {selectedFile && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
          >
            {isPending ? "업로드 중..." : "업로드"}
          </Button>
        )}
        {posterUrl && !selectedFile && (
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "삭제 중..." : "포스터 삭제"}
          </Button>
        )}
      </div>

      {selectedFile && (
        <p className="text-xs text-gray-500">선택된 파일: {selectedFile.name}</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}
