"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeMatchAction } from "./actions";
import type { MatchResultRow } from "@/lib/api/matches";
import type { DivisionRow } from "@/lib/api/divisions";
import type { Court } from "@/lib/api/courts";

type Props = {
  tournamentId: string;
  matches: MatchResultRow[];
  divisions: DivisionRow[];
  courts: Court[];
  currentDivisionId: string;
  currentCourtId: string;
};

type RowState = {
  scoreA: string;
  scoreB: string;
  saving: boolean;
  savedMessage: string | null;
  error: string | null;
};

const buildRowState = (match: MatchResultRow): RowState => ({
  scoreA: match.score_a !== null ? String(match.score_a) : "",
  scoreB: match.score_b !== null ? String(match.score_b) : "",
  saving: false,
  savedMessage: null,
  error: null,
});

const emptyRowState: RowState = {
  scoreA: "",
  scoreB: "",
  saving: false,
  savedMessage: null,
  error: null,
};

function statusLabel(status: string): string {
  return status === "completed" ? "완료" : "미완료";
}

function statusClass(status: string): string {
  return status === "completed"
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-600";
}

export default function ResultEntryForm({
  tournamentId,
  matches,
  divisions,
  courts,
  currentDivisionId,
  currentCourtId,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const initialRowStates: Record<string, RowState> = {};
  for (const m of matches) {
    initialRowStates[m.id] = buildRowState(m);
  }

  const [rowStates, setRowStates] =
    useState<Record<string, RowState>>(initialRowStates);

  useEffect(() => {
    setRowStates((prev) => {
      const next: Record<string, RowState> = {};
      for (const m of matches) {
        const existing = prev[m.id];
        next[m.id] = existing ? { ...existing } : buildRowState(m);
      }
      return next;
    });
  }, [matches]);

  function setRow(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyRowState), ...patch },
    }));
  }

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (currentDivisionId) params.set("divisionId", currentDivisionId);
    if (currentCourtId) params.set("courtId", currentCourtId);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params.toString();
  }

  function navigate(overrides: Record<string, string>) {
    startTransition(() => {
      router.push(
        `/admin/tournaments/${tournamentId}/results?${buildParams(overrides)}`
      );
    });
  }

  async function handleSave(match: MatchResultRow) {
    const row = rowStates[match.id] ?? buildRowState(match);
    const a = parseInt(row.scoreA, 10);
    const b = parseInt(row.scoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      setRow(match.id, { error: "점수를 올바르게 입력해주세요." });
      return;
    }
    setRow(match.id, { saving: true, error: null, savedMessage: null });
    const result = await completeMatchAction(match.id, a, b, tournamentId);
    if (result.ok) {
      setRow(match.id, { saving: false, savedMessage: "완료 처리됨" });
      setTimeout(() => {
        setRow(match.id, { savedMessage: null });
        router.refresh();
      }, 800);
    } else {
      setRow(match.id, { saving: false, error: result.error });
    }
  }


  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={currentDivisionId}
          onChange={(e) => navigate({ divisionId: e.target.value })}
        >
          <option value="">전체 Division</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {courts.length > 0 && (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={currentCourtId}
            onChange={(e) => navigate({ courtId: e.target.value })}
          >
            <option value="">전체 코트</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Match Table – 코트별 섹션 */}
      {matches.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">해당 조건의 경기가 없습니다.</p>
          <a
            href={`/admin/tournaments/${tournamentId}/bracket`}
            className="text-blue-600 underline text-sm"
          >
            조/경기 생성 페이지로 이동
          </a>
        </div>
      ) : (
        (() => {
          /* 코트별 섹션 그룹핑 */
          const courtOrder = new Map(
            courts.map((c, i) => [c.id, i])
          );
          type Section = {
            key: string;
            label: string;
            order: number;
            matches: MatchResultRow[];
          };
          const sectionMap = new Map<string, Section>();

          for (const m of matches) {
            const key = m.court_id ?? "__unassigned__";
            if (!sectionMap.has(key)) {
              sectionMap.set(key, {
                key,
                label: m.courtName ?? "미배정",
                order: m.court_id
                  ? (courtOrder.get(m.court_id) ?? 999)
                  : 9999,
                matches: [],
              });
            }
            sectionMap.get(key)!.matches.push(m);
          }

          const sections = [...sectionMap.values()].sort(
            (a, b) => a.order - b.order
          );

          return (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-700">
                      🏀 {section.label}
                    </h2>
                    <span className="text-xs text-gray-400">
                      {section.matches.length}경기
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-3 py-2">시간</th>
                          <th className="px-3 py-2">Division</th>
                          <th className="px-3 py-2">경기</th>
                          <th className="px-3 py-2 text-center" colSpan={3}>
                            스코어
                          </th>
                          <th className="px-3 py-2">상태</th>
                          <th className="px-3 py-2">작업</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {section.matches.map((m) => {
                          const row = rowStates[m.id] ?? buildRowState(m);
                          const isBusy = row.saving;
                          return (
                            <tr key={m.id} className="hover:bg-gray-50">
                              {/* 시간 */}
                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                {m.scheduled_at
                                  ? new Date(
                                      m.scheduled_at
                                    ).toLocaleTimeString("ko-KR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "미배정"}
                              </td>

                              {/* Division */}
                              <td className="px-3 py-2">
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                                  {m.divisionName}
                                </span>
                                {m.groupName && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {m.groupName}
                                  </div>
                                )}
                              </td>

                              {/* Teams */}
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="font-medium">
                                  {m.teamAName}
                                </span>
                                <span className="text-gray-400 mx-1">vs</span>
                                <span className="font-medium">
                                  {m.teamBName}
                                </span>
                              </td>

                              {/* Score A */}
                              <td className="px-1 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                  value={row.scoreA}
                                  onChange={(e) =>
                                    setRow(m.id, { scoreA: e.target.value })
                                  }
                                  disabled={isBusy}
                                  placeholder="0"
                                />
                              </td>

                              <td className="px-1 py-2 text-gray-400 text-center">
                                :
                              </td>

                              {/* Score B */}
                              <td className="px-1 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                  value={row.scoreB}
                                  onChange={(e) =>
                                    setRow(m.id, { scoreB: e.target.value })
                                  }
                                  disabled={isBusy}
                                  placeholder="0"
                                />
                              </td>

                              {/* Status + Feedback */}
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-block text-xs px-2 py-0.5 rounded ${statusClass(m.status)}`}
                                >
                                  {statusLabel(m.status)}
                                </span>
                                {row.savedMessage && (
                                  <div className="text-xs text-green-600 mt-0.5">
                                    {row.savedMessage}
                                  </div>
                                )}
                                {row.error && (
                                  <div className="text-xs text-red-500 mt-0.5">
                                    {row.error}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                  onClick={() => handleSave(m)}
                                  disabled={isBusy}
                                >
                                  {row.saving ? "처리 중..." : "저장"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <p className="text-right text-xs text-gray-400">
                총 {matches.length}경기
              </p>
            </div>
          );
        })()
      )}
    </div>
  );
}
