"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import type { Player } from "@/lib/api/players";
import {
  createPlayerAction,
  updatePlayerAction,
  deletePlayerAction,
} from "./actions";

/* ── Player Form (추가/수정 공용) ──────────────────── */

export function PlayerForm({
  teamId,
  player,
  onCancel,
}: {
  teamId: string;
  player?: Player;
  onCancel: () => void;
}) {
  const router = useRouter();
  const isEdit = !!player;

  const [name, setName] = useState(player?.name ?? "");
  const [number, setNumber] = useState(player?.number?.toString() ?? "");
  const [position, setPosition] = useState(player?.position ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("선수 이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      name: trimmedName,
      number: number.trim() ? parseInt(number.trim(), 10) : null,
      position: position.trim() || null,
    };

    const result = isEdit
      ? await updatePlayerAction(teamId, player!.id, payload)
      : await createPlayerAction(teamId, payload);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="player-name" className="block text-sm font-medium text-gray-700">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="player-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="선수 이름"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="player-number" className="block text-sm font-medium text-gray-700">
          등번호 <span className="text-xs text-gray-400">(선택)</span>
        </label>
        <input
          id="player-number"
          type="number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="등번호"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="player-position" className="block text-sm font-medium text-gray-700">
          포지션 <span className="text-xs text-gray-400">(선택)</span>
        </label>
        <input
          id="player-position"
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="가드, 포워드, 센터 등"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          disabled={loading}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "저장 중…" : isEdit ? "수정" : "추가"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          취소
        </Button>
      </div>
    </form>
  );
}

/* ── Player List (manager 전용 액션 포함) ──────────── */

export function PlayerList({
  teamId,
  players,
  isManager,
}: {
  teamId: string;
  players: Player[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(playerId: string) {
    if (!confirm("이 선수를 삭제하시겠습니까?")) return;
    setDeletingId(playerId);
    const result = await deletePlayerAction(teamId, playerId);
    setDeletingId(null);
    if (result.error) {
      alert("삭제 실패: " + result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">선수 목록</h2>
        {isManager && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>+ 선수 추가</Button>
        )}
      </div>

      {/* 선수 추가 폼 */}
      {showAddForm && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <PlayerForm teamId={teamId} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {/* 빈 상태 */}
      {players.length === 0 && (
        <div className="rounded-xl border bg-white py-8 text-center shadow-sm">
          <EmptyState message="등록된 선수가 없습니다." />
        </div>
      )}

      {/* 선수 목록 */}
      {players.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">등번호</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">포지션</th>
                {isManager && (
                  <th className="px-4 py-3 text-right font-medium text-gray-600">관리</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map((p) => (
                <tr key={p.id}>
                  {editingId === p.id ? (
                    <td colSpan={isManager ? 4 : 3} className="px-4 py-3">
                      <PlayerForm
                        teamId={teamId}
                        player={p}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.number ?? "-"}</td>
                      <td className="px-4 py-3">{p.position ?? "-"}</td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => setEditingId(p.id)}
                            >
                              수정
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id ? "삭제 중…" : "삭제"}
                            </Button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
