"use client";

import { useState, useTransition } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Court } from "@/lib/api/courts";
import {
  createCourtAction,
  updateCourtAction,
  deleteCourtAction,
} from "../actions";

type CourtsTabProps = {
  tournamentId: string;
  initialCourts: Court[];
};

export default function CourtsTab({ tournamentId, initialCourts }: CourtsTabProps) {
  const [courts, setCourts] = useState(initialCourts);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">코트</h2>
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
        <EmptyState message="등록된 코트가 없습니다." />
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
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handleDelete = () => setShowConfirm(true);

  const doDelete = () => {
    setShowConfirm(false);
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
    <>
      {showConfirm && (
        <ConfirmModal
          message={`"${court.name}" 코트를 삭제하시겠습니까?`}
          onConfirm={doDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <li className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{court.name}</p>
          <p className="text-xs text-gray-400">순서: {court.display_order ?? "-"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(true)} disabled={isPending}>
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
    </>
  );
}
