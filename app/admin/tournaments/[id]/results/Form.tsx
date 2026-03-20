"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeMatchAction } from "./actions";
import type { MatchResultRow } from "@/lib/api/matches";
import type { DivisionRow } from "@/lib/api/divisions";
import type { Court } from "@/lib/api/courts";
import Card from "@/components/ui/Card";
import {
  formatLeagueMatchLabel,
  formatTournamentCategoryLabel,
  formatTournamentMatchLabel,
  getInitialTournamentRound,
  getPreviousTournamentRound,
} from "@/lib/formatters/matchLabel";

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

const isAssignedTeam = (name: string | null | undefined) =>
  Boolean(name && name !== "TBD");

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

function formatTime(iso: string | null) {
  if (!iso) return "미배정";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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

      {/* Match Tables – 코트 > 디비전 > 리그/토너먼트 */}
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
          const courtOrder = new Map(courts.map((c, i) => [c.id, i]));
          const divisionOrder = new Map(divisions.map((d, i) => [d.id, i]));

          type DivisionSection = {
            id: string;
            label: string;
            order: number;
            leagueMatches: MatchResultRow[];
            tournamentMatches: MatchResultRow[];
          };

          type Section = {
            key: string;
            label: string;
            order: number;
            divisions: DivisionSection[];
            totalMatches: number;
          };

          const sectionMap = new Map<
            string,
            { section: Section; divisions: Map<string, DivisionSection> }
          >();

          for (const m of matches) {
            const key = m.court_id ?? "__unassigned__";
            if (!sectionMap.has(key)) {
              sectionMap.set(key, {
                section: {
                  key,
                  label: m.courtName ?? "미배정",
                  order: m.court_id ? (courtOrder.get(m.court_id) ?? 999) : 9999,
                  divisions: [],
                  totalMatches: 0,
                },
                divisions: new Map<string, DivisionSection>(),
              });
            }

            const entry = sectionMap.get(key);
            if (!entry) continue;

            if (!entry.divisions.has(m.division_id)) {
              entry.divisions.set(m.division_id, {
                id: m.division_id,
                label: m.divisionName,
                order: divisionOrder.get(m.division_id) ?? 999,
                leagueMatches: [],
                tournamentMatches: [],
              });
            }

            const divisionSection = entry.divisions.get(m.division_id);
            if (!divisionSection) continue;

            if (m.group_id) {
              divisionSection.leagueMatches.push(m);
            } else {
              divisionSection.tournamentMatches.push(m);
            }
            entry.section.totalMatches += 1;
          }

          const sections = [...sectionMap.values()].sort(
            (a, b) => a.section.order - b.section.order
          );

          return (
            <div className="space-y-6">
              {sections.map(({ section, divisions: divisionMap }) => {
                const divisionsList = [...divisionMap.values()].sort((a, b) =>
                  a.order !== b.order
                    ? a.order - b.order
                    : a.label.localeCompare(b.label, "ko-KR")
                );

                return (
                  <Card key={section.key}>
                    <div className="mb-2 flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-700">
                        🏀 {section.label}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {section.totalMatches}경기
                      </span>
                    </div>

                    <div className="space-y-4">
                      {divisionsList.map((division) => (
                        <Card key={division.id} className="bg-slate-50">
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">
                              {division.label}
                            </h3>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="mb-2 text-xs font-semibold text-gray-500">
                                리그
                              </p>
                              {division.leagueMatches.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  리그 경기가 없습니다.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <table className="w-full table-fixed text-sm">
                                    <colgroup>
                                      <col className="w-28" />
                                      <col className="w-24" />
                                      <col className="w-auto" />
                                      <col className="w-16" />
                                      <col className="w-8" />
                                      <col className="w-16" />
                                      <col className="w-24" />
                                      <col className="w-20" />
                                    </colgroup>
                                    <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                                      <tr>
                                        <th className="px-3 py-2">시간</th>
                                        <th className="px-3 py-2">구분</th>
                                        <th className="px-3 py-2">경기</th>
                                        <th className="px-3 py-2 text-center" colSpan={3}>
                                          스코어
                                        </th>
                                        <th className="px-3 py-2">상태</th>
                                        <th className="px-3 py-2">저장</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {division.leagueMatches.map((m) => {
                                        const row = rowStates[m.id] ?? buildRowState(m);
                                        const isBusy = row.saving;
                                        return (
                                          <tr key={m.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                              {formatTime(m.scheduled_at)}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {m.groupName ?? "-"}
                                            </td>
                                            <td
                                              className="px-3 py-2 font-medium truncate"
                                              title={formatLeagueMatchLabel({
                                                groupName: m.groupName,
                                                teamA: m.teamAName,
                                                teamB: m.teamBName,
                                              })}
                                            >
                                              {formatLeagueMatchLabel({
                                                groupName: m.groupName,
                                                teamA: m.teamAName,
                                                teamB: m.teamBName,
                                              })}
                                            </td>
                                            <td className="px-2 py-2">
                                              <input
                                                type="number"
                                                className="w-14 border rounded px-1 py-1 text-sm"
                                                value={row.scoreA}
                                                onChange={(e) =>
                                                  setRow(m.id, { scoreA: e.target.value })
                                                }
                                                disabled={isBusy}
                                              />
                                            </td>
                                            <td className="px-2 py-2 text-gray-400">:</td>
                                            <td className="px-2 py-2">
                                              <input
                                                type="number"
                                                className="w-14 border rounded px-1 py-1 text-sm"
                                                value={row.scoreB}
                                                onChange={(e) =>
                                                  setRow(m.id, { scoreB: e.target.value })
                                                }
                                                disabled={isBusy}
                                              />
                                            </td>
                                            <td className="px-3 py-2">
                                              <span
                                                className={`text-xs px-2 py-1 rounded ${statusClass(
                                                  m.status
                                                )}`}
                                              >
                                                {statusLabel(m.status)}
                                              </span>
                                              {row.savedMessage && (
                                                <div className="text-green-600 text-xs mt-1">
                                                  {row.savedMessage}
                                                </div>
                                              )}
                                              {row.error && (
                                                <div className="text-red-600 text-xs mt-1">
                                                  {row.error}
                                                </div>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              <button
                                                onClick={() => handleSave(m)}
                                                disabled={isBusy}
                                                className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                                              >
                                                {isBusy ? "저장 중..." : "완료"}
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold text-gray-500">
                                토너먼트
                              </p>
                              {division.tournamentMatches.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  토너먼트 경기가 없습니다.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <table className="w-full table-fixed text-sm">
                                    <colgroup>
                                      <col className="w-28" />
                                      <col className="w-28" />
                                      <col className="w-auto" />
                                      <col className="w-28" />
                                      <col className="w-16" />
                                      <col className="w-8" />
                                      <col className="w-16" />
                                      <col className="w-24" />
                                      <col className="w-20" />
                                    </colgroup>
                                    <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                                      <tr>
                                        <th className="px-3 py-2">시간</th>
                                        <th className="px-3 py-2">구분</th>
                                        <th className="px-3 py-2">경기</th>
                                        <th className="px-3 py-2">코트</th>
                                        <th className="px-3 py-2 text-center" colSpan={3}>
                                          스코어
                                        </th>
                                        <th className="px-3 py-2">상태</th>
                                        <th className="px-3 py-2">저장</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {(() => {
                                        const roundCounts = new Map<string, number>();
                                        division.tournamentMatches.forEach((match) => {
                                          const key = match.round ?? "tournament";
                                          roundCounts.set(key, (roundCounts.get(key) ?? 0) + 1);
                                        });
                                        const initialRound =
                                          getInitialTournamentRound(roundCounts);
                                        const roundIndexes = new Map<string, number>();

                                        return division.tournamentMatches.map((m) => {
                                          const row = rowStates[m.id] ?? buildRowState(m);
                                          const isBusy = row.saving;
                                          const key = m.round ?? "tournament";
                                          const nextIndex = (roundIndexes.get(key) ?? 0) + 1;
                                          roundIndexes.set(key, nextIndex);
                                          const roundTotal = roundCounts.get(key) ?? null;
                                          const previousRound =
                                            getPreviousTournamentRound(m.round ?? null);
                                          const previousRoundTotal = previousRound
                                            ? roundCounts.get(previousRound) ?? null
                                            : null;
                                          const matchLabel = formatTournamentMatchLabel({
                                            round: m.round,
                                            teamA: m.teamAName,
                                            teamB: m.teamBName,
                                            roundIndex: nextIndex,
                                            roundTotal,
                                            initialRound,
                                            previousRoundTotal,
                                          });
                                          const canEditTournamentScore =
                                            isAssignedTeam(m.teamAName) &&
                                            isAssignedTeam(m.teamBName);

                                          return (
                                            <tr key={m.id} className="hover:bg-gray-50">
                                              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                                {formatTime(m.scheduled_at)}
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">
                                                {formatTournamentCategoryLabel(
                                                  m.round,
                                                  nextIndex,
                                                  roundTotal
                                                )}
                                              </td>
                                              <td
                                                className="px-3 py-2 font-medium truncate"
                                                title={matchLabel}
                                              >
                                                {matchLabel}
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">
                                                {m.courtName ?? "미배정"}
                                              </td>
                                              <td className="px-2 py-2">
                                                <input
                                                  type="number"
                                                  className="w-14 border rounded px-1 py-1 text-sm"
                                                  value={row.scoreA}
                                                  onChange={(e) =>
                                                    setRow(m.id, { scoreA: e.target.value })
                                                  }
                                                  disabled={isBusy || !canEditTournamentScore}
                                                />
                                              </td>
                                              <td className="px-2 py-2 text-gray-400">:</td>
                                              <td className="px-2 py-2">
                                                <input
                                                  type="number"
                                                  className="w-14 border rounded px-1 py-1 text-sm"
                                                  value={row.scoreB}
                                                  onChange={(e) =>
                                                    setRow(m.id, { scoreB: e.target.value })
                                                  }
                                                  disabled={isBusy || !canEditTournamentScore}
                                                />
                                              </td>
                                              <td className="px-3 py-2">
                                                <span
                                                  className={`text-xs px-2 py-1 rounded ${statusClass(
                                                    m.status
                                                  )}`}
                                                >
                                                  {statusLabel(m.status)}
                                                </span>
                                                {row.savedMessage && (
                                                  <div className="text-green-600 text-xs mt-1">
                                                    {row.savedMessage}
                                                  </div>
                                                )}
                                                {row.error && (
                                                  <div className="text-red-600 text-xs mt-1">
                                                    {row.error}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-3 py-2">
                                                <button
                                                  onClick={() => handleSave(m)}
                                                  disabled={isBusy || !canEditTournamentScore}
                                                  className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                                                >
                                                  {isBusy ? "저장 중..." : "완료"}
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        });
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
}
