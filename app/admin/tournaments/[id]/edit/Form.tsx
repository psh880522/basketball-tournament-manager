"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import {
  TOURNAMENT_SIZE_LABELS,
  TOURNAMENT_SIZE_OPTIONS,
} from "@/lib/constants/tournament";
import {
  type TournamentEditRow,
  type TournamentStatus,
} from "@/lib/api/tournaments";
import type { DivisionRow } from "@/lib/api/divisions";
import type { Court } from "@/lib/api/courts";
import { updateTournamentAction } from "./actions";
import {
  createDivisionAction,
  updateDivisionAction,
  deleteDivisionAction,
  createCourtAction,
  updateCourtAction,
  deleteCourtAction,
} from "./actions";

type TournamentEditFormProps = {
  tournament: TournamentEditRow;
};

const statusLabels: Record<TournamentStatus, string> = {
  draft: "준비중",
  open: "모집중",
  closed: "진행중",
  finished: "완료",
};

export default function TournamentEditForm({
  tournament,
}: TournamentEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name ?? "");
  const [location, setLocation] = useState(tournament.location ?? "");
  const [startDate, setStartDate] = useState(tournament.start_date ?? "");
  const [endDate, setEndDate] = useState(tournament.end_date ?? "");
  const [maxTeams, setMaxTeams] = useState(
    tournament.max_teams ? String(tournament.max_teams) : ""
  );
  const [status, setStatus] = useState<TournamentStatus>(tournament.status);
  const [scheduleStartAt, setScheduleStartAt] = useState(
    tournament.schedule_start_at
      ? new Date(tournament.schedule_start_at).toISOString().slice(0, 16)
      : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFinished = tournament.status === "finished";

  const maxTeamsValue = useMemo(() => {
    if (!maxTeams.trim()) return null;
    const parsed = Number(maxTeams);
    return Number.isFinite(parsed) ? parsed : null;
  }, [maxTeams]);

  const isMaxTeamsValid =
    maxTeamsValue === null ||
    (Number.isInteger(maxTeamsValue) && maxTeamsValue >= 2);

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => {
      router.push("/admin");
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [router, success]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(() => {
      updateTournamentAction({
        tournamentId: tournament.id,
        name: name.trim(),
        location: location.trim() ? location.trim() : null,
        start_date: startDate,
        end_date: endDate,
        status,
        max_teams: maxTeamsValue,
        schedule_start_at: scheduleStartAt
          ? new Date(scheduleStartAt).toISOString()
          : null,
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
    <Card className="space-y-6">
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">시작일</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">종료일</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">상태</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as TournamentStatus)}
            disabled={isFinished}
          >
            {(Object.keys(statusLabels) as TournamentStatus[]).map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
          {isFinished ? (
            <p className="text-xs text-gray-500">
              종료된 대회는 상태를 변경할 수 없습니다.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              종료 상태로 변경 시 되돌릴 수 없습니다.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">최대 팀 수</label>
          <input
            type="number"
            min={2}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              isMaxTeamsValid ? "border-gray-300" : "border-rose-400"
            }`}
            value={maxTeams}
            onChange={(event) => setMaxTeams(event.target.value)}
            placeholder="예: 16"
          />
          <FieldHint>비워두면 제한 없이 등록됩니다.</FieldHint>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">대회 시작 시간</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={scheduleStartAt}
            onChange={(event) => setScheduleStartAt(event.target.value)}
          />
          <FieldHint>대회 시작 시간 기준으로 스케줄의 시간을 자동 계산합니다.</FieldHint>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!isMaxTeamsValid ? (
          <p className="text-sm text-red-600">
            최대 팀 수는 2 이상의 정수여야 합니다.
          </p>
        ) : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending || !isMaxTeamsValid}>
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

/* ───────────────── Divisions Section ───────────────── */

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
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Divisions</h2>
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
    </Card>
  );
}

/* ─── Add form ─── */

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
          placeholder="예: 고등부, 일반부"
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
          <option value="">선택</option>
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
          토너먼트 크기를 선택하세요.
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

/* ─── Division item with inline edit ─── */

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
              <option value="">선택</option>
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
              토너먼트 크기를 선택하세요.
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
          그룹 크기: {division.group_size ?? "-"} · 토너먼트 크기:{" "}
          {division.tournament_size ?? "-"} · 정렬:{" "}
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

/* ───────────────── Courts Section ───────────────── */

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
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Courts</h2>
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
    </Card>
  );
}

/* ─── Add court form ─── */

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

/* ─── Court item ─── */

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
            정렬
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
          정렬: {court.display_order ?? "-"}
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
