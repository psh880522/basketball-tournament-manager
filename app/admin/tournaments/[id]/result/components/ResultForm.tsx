"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  formatLeagueMatchLabel,
  formatTournamentCategoryLabel,
  formatTournamentMatchLabel,
  getInitialTournamentRound,
  getPreviousTournamentRound,
} from "@/lib/formatters/matchLabel";
import type {
  LeagueMatchRow,
  LeagueStandingRow,
  SeedingPreviewRow,
  TournamentMatchRow,
  TournamentProgress,
} from "@/lib/api/results";
import {
  calculateLeagueStandingsAction,
  seedTournamentTeamsAction,
  saveLeagueResultsAction,
  saveTournamentResultAction,
} from "../actions";

type Props = {
  tournamentId: string;
  divisionId: string;
  divisionName: string;
  isOrganizer: boolean;
  standingsDirty: boolean;
  isConfirmed: boolean;
  tournamentSize: number | null;
  standings: LeagueStandingRow[];
  preview: SeedingPreviewRow[];
  matches: LeagueMatchRow[];
  tournamentMatches: TournamentMatchRow[];
  tournamentProgress: TournamentProgress | null;
};

type Message = { tone: "success" | "error"; text: string } | null;

type ScoreState = {
  scoreA: string;
  scoreB: string;
};

type CourtMatchSection<T> = {
  key: string;
  label: string;
  order: number;
  matches: T[];
  totalMatches: number;
};

const isAssignedTeam = (name: string | null | undefined) =>
  Boolean(name && name !== "TBD");

const statusLabel = (status: string): string =>
  status === "completed" ? "완료" : "미완료";

const statusClass = (status: string): string =>
  status === "completed"
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-600";

const roundLabelMap: Record<string, string> = {
  round_of_16: "16강",
  quarterfinal: "8강",
  semifinal: "4강",
  final: "결승",
  third_place: "3/4위전",
};

const formatTime = (iso: string | null) => {
  if (!iso) return "미배정";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export default function ResultForm({
  tournamentId,
  divisionId,
  divisionName,
  isOrganizer,
  standingsDirty,
  isConfirmed,
  tournamentSize,
  standings,
  preview,
  matches,
  tournamentMatches,
  tournamentProgress,
}: Props) {
  const [message, setMessage] = useState<Message>(null);
  const [isSaving, startSaving] = useTransition();
  const [isCalculating, startCalculating] = useTransition();
  const [isSeeding, startSeeding] = useTransition();
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, Message>>({});
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});
  const [tournamentScores, setTournamentScores] = useState<Record<string, ScoreState>>({});
  const [savingTournamentId, setSavingTournamentId] = useState<string | null>(null);
  const [tournamentRowMessages, setTournamentRowMessages] = useState<Record<string, Message>>({});

  const divisionRanks = useMemo(() => {
    const map: Record<string, number> = {};
    standings.forEach((row) => {
      if (row.team_id && row.rank) {
        map[row.team_id] = row.rank;
      }
    });
    return map;
  }, [standings]);

  const safeMatches = matches ?? [];
  const editableMatches = useMemo(
    () => safeMatches.filter((match) => match.stage_type === "group"),
    [safeMatches]
  );

  const tournamentRows = useMemo(
    () => tournamentMatches ?? [],
    [tournamentMatches]
  );

  const leagueCourts = useMemo(() => {
    const courtMap = new Map<string, CourtMatchSection<LeagueMatchRow>>();

    editableMatches.forEach((match) => {
      const courtKey = match.court_id ?? "__unassigned__";
      if (!courtMap.has(courtKey)) {
        courtMap.set(courtKey, {
          key: courtKey,
          label: match.court?.name ?? "미배정",
          order: match.court_id ? 0 : 1,
          matches: [],
          totalMatches: 0,
        });
      }

      const entry = courtMap.get(courtKey);
      if (!entry) return;
      entry.matches.push(match);
      entry.totalMatches += 1;
    });

    return [...courtMap.values()].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.label.localeCompare(b.label, "ko-KR");
    });
  }, [editableMatches]);

  const tournamentCourts = useMemo(() => {
    const courtMap = new Map<string, CourtMatchSection<TournamentMatchRow>>();

    tournamentRows.forEach((match) => {
      const courtKey = match.court_id ?? "__unassigned__";
      if (!courtMap.has(courtKey)) {
        courtMap.set(courtKey, {
          key: courtKey,
          label: match.court?.name ?? "미배정",
          order: match.court_id ? 0 : 1,
          matches: [],
          totalMatches: 0,
        });
      }

      const entry = courtMap.get(courtKey);
      if (!entry) return;
      entry.matches.push(match);
      entry.totalMatches += 1;
    });

    return [...courtMap.values()].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.label.localeCompare(b.label, "ko-KR");
    });
  }, [tournamentRows]);

  const initialScores = useMemo(() => {
    const next: Record<string, ScoreState> = {};
    editableMatches.forEach((match) => {
      next[match.id] = {
        scoreA: match.score_a !== null ? String(match.score_a) : "",
        scoreB: match.score_b !== null ? String(match.score_b) : "",
      };
    });
    return next;
  }, [editableMatches]);

  useEffect(() => {
    if (editableMatches.length === 0) return;
    setScores((prev) => {
      let changed = false;
      const next: Record<string, ScoreState> = { ...prev };

      Object.entries(initialScores).forEach(([matchId, score]) => {
        const current = prev[matchId];
        if (!current) {
          next[matchId] = score;
          changed = true;
          return;
        }
        if (current.scoreA !== score.scoreA || current.scoreB !== score.scoreB) {
          next[matchId] = score;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [editableMatches, initialScores]);

  const initialTournamentScores = useMemo(() => {
    const next: Record<string, ScoreState> = {};
    tournamentRows.forEach((match) => {
      next[match.id] = {
        scoreA: match.score_a !== null ? String(match.score_a) : "",
        scoreB: match.score_b !== null ? String(match.score_b) : "",
      };
    });
    return next;
  }, [tournamentRows]);

  useEffect(() => {
    if (tournamentRows.length === 0) return;
    setTournamentScores((prev) => {
      let changed = false;
      const next: Record<string, ScoreState> = { ...prev };

      Object.entries(initialTournamentScores).forEach(([matchId, score]) => {
        const current = prev[matchId];
        if (!current) {
          next[matchId] = score;
          changed = true;
          return;
        }
        if (current.scoreA !== score.scoreA || current.scoreB !== score.scoreB) {
          next[matchId] = score;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [tournamentRows, initialTournamentScores]);

  const handleScoreChange = (matchId: string, key: "scoreA" | "scoreB", value: string) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        scoreA: prev[matchId]?.scoreA ?? "",
        scoreB: prev[matchId]?.scoreB ?? "",
        [key]: value,
      },
    }));
  };

  const handleTournamentScoreChange = (
    matchId: string,
    key: "scoreA" | "scoreB",
    value: string
  ) => {
    setTournamentScores((prev) => ({
      ...prev,
      [matchId]: {
        scoreA: prev[matchId]?.scoreA ?? "",
        scoreB: prev[matchId]?.scoreB ?? "",
        [key]: value,
      },
    }));
  };

  const handleSaveMatch = (matchId: string) => {
    setMessage(null);
    setRowMessages((prev) => ({ ...prev, [matchId]: null }));

    const score = scores[matchId] ?? { scoreA: "", scoreB: "" };
    if (score.scoreA === "" || score.scoreB === "") {
      setMessage({ tone: "error", text: "점수를 모두 입력해주세요." });
      return;
    }
    const scoreA = Number(score.scoreA);
    const scoreB = Number(score.scoreB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      setMessage({ tone: "error", text: "점수 형식이 올바르지 않습니다." });
      return;
    }

    setSavingMatchId(matchId);
    startSaving(async () => {
      const result = await saveLeagueResultsAction({
        tournamentId,
        divisionId,
        results: [{ matchId, scoreA, scoreB }],
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        setRowMessages((prev) => ({
          ...prev,
          [matchId]: { tone: "error", text: result.error },
        }));
        setSavingMatchId(null);
        return;
      }
      setMessage({ tone: "success", text: "리그 경기 결과가 저장되었습니다." });
      setRowStatus((prev) => ({ ...prev, [matchId]: "completed" }));
      setRowMessages((prev) => ({
        ...prev,
        [matchId]: { tone: "success", text: "저장 완료" },
      }));
      setSavingMatchId(null);
      setTimeout(() => {
        setRowMessages((prev) => ({ ...prev, [matchId]: null }));
      }, 1200);
    });
  };

  const handleSaveTournamentMatch = (matchId: string) => {
    setMessage(null);
    setTournamentRowMessages((prev) => ({ ...prev, [matchId]: null }));

    const score = tournamentScores[matchId] ?? { scoreA: "", scoreB: "" };
    if (score.scoreA === "" || score.scoreB === "") {
      setMessage({ tone: "error", text: "점수를 모두 입력해주세요." });
      return;
    }
    const scoreA = Number(score.scoreA);
    const scoreB = Number(score.scoreB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      setMessage({ tone: "error", text: "점수 형식이 올바르지 않습니다." });
      return;
    }

    setSavingTournamentId(matchId);
    startSaving(async () => {
      const result = await saveTournamentResultAction({
        tournamentId,
        divisionId,
        matchId,
        scoreA,
        scoreB,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        setTournamentRowMessages((prev) => ({
          ...prev,
          [matchId]: { tone: "error", text: result.error },
        }));
        setSavingTournamentId(null);
        return;
      }
      const messageText = result.message ?? "저장 완료";
      setMessage({ tone: "success", text: messageText });
      setTournamentRowMessages((prev) => ({
        ...prev,
        [matchId]: { tone: "success", text: messageText },
      }));
      setSavingTournamentId(null);
      setTimeout(() => {
        setTournamentRowMessages((prev) => ({ ...prev, [matchId]: null }));
      }, 1200);
    });
  };

  const handleSeed = () => {
    setMessage(null);
    startSeeding(async () => {
      const result = await seedTournamentTeamsAction({
        tournamentId,
        divisionId,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "토너먼트 팀 배치가 완료되었습니다." });
    });
  };

  const handleCalculate = () => {
    setMessage(null);
    startCalculating(async () => {
      const result = await calculateLeagueStandingsAction({
        tournamentId,
        divisionId,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "리그 순위가 계산 및 확정되었습니다." });
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">리그 결과 입력</h2>
            <p className="text-xs text-gray-500">리그 경기만 표시됩니다.</p>
          </div>
        </div>

        {editableMatches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">리그 경기가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leagueCourts.map((court) => (
              <Card key={court.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    🏀 {court.label}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {court.totalMatches}경기
                  </span>
                </div>

                <Card className="bg-slate-50">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {divisionName}
                    </h4>
                  </div>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    {(() => {
                      const orderedMatches = [...court.matches].sort((a, b) => {
                        const aTime = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity;
                        const bTime = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity;
                        if (aTime !== bTime) return aTime - bTime;
                        return a.id.localeCompare(b.id);
                      });

                      return (
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
                          <th className="px-3 py-2 text-center">상태</th>
                          <th className="px-3 py-2 text-center">저장</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orderedMatches.map((match) => (
                          <tr key={match.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                              {formatTime(match.scheduled_at)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                              {match.group?.name ?? "-"}
                            </td>
                            <td
                              className="px-3 py-2 whitespace-nowrap truncate"
                              title={formatLeagueMatchLabel({
                                groupName: match.group?.name,
                                teamA: match.team_a?.team_name ?? "TBD",
                                teamB: match.team_b?.team_name ?? "TBD",
                              })}
                            >
                              <span className="font-medium">
                                {formatLeagueMatchLabel({
                                  groupName: match.group?.name,
                                  teamA: match.team_a?.team_name ?? "TBD",
                                  teamB: match.team_b?.team_name ?? "TBD",
                                })}
                              </span>
                            </td>
                            <td className="px-1 py-2 text-center">
                              <input
                                type="number"
                                min={0}
                                className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                value={scores[match.id]?.scoreA ?? ""}
                                onChange={(event) =>
                                  handleScoreChange(match.id, "scoreA", event.target.value)
                                }
                                disabled={!isOrganizer || isSaving}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-1 py-2 text-gray-400 text-center">:</td>
                            <td className="px-1 py-2 text-center">
                              <input
                                type="number"
                                min={0}
                                className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                value={scores[match.id]?.scoreB ?? ""}
                                onChange={(event) =>
                                  handleScoreChange(match.id, "scoreB", event.target.value)
                                }
                                disabled={!isOrganizer || isSaving}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-block text-xs px-2 py-0.5 rounded ${statusClass(
                                  rowStatus[match.id] ?? match.status
                                )}`}
                              >
                                {statusLabel(rowStatus[match.id] ?? match.status)}
                              </span>
                              {rowMessages[match.id] && (
                                <div
                                  className={`mt-0.5 text-xs ${
                                    rowMessages[match.id]?.tone === "error"
                                      ? "text-red-500"
                                      : "text-green-600"
                                  }`}
                                >
                                  {rowMessages[match.id]?.text}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                onClick={() => handleSaveMatch(match.id)}
                                disabled={!isOrganizer || isSaving || savingMatchId === match.id}
                              >
                                {savingMatchId === match.id ? "저장 중..." : "저장"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      );
                    })()}
                  </div>
                </Card>
              </Card>
            ))}
          </div>
        )}

        {!isOrganizer && (
          <p className="text-sm text-gray-500">권한이 없습니다.</p>
        )}

        <div className="border-t border-gray-200 pt-4">
          <div>
            <h3 className="text-base font-semibold">리그 순위 계산</h3>
            <p className="text-xs text-gray-500">
              현재 저장된 리그 경기 결과만 기준으로 계산되며 자동으로 확정됩니다.
            </p>
          </div>
          {standingsDirty ? (
            <p className="text-sm text-red-600">리그 순위 확정 불가: 순위 재계산 필요</p>
          ) : isConfirmed ? (
            <p className="text-sm text-emerald-600">리그 순위 확정됨</p>
          ) : (
            <p className="text-sm text-gray-600">확정 가능한 상태입니다.</p>
          )}
          {isOrganizer ? (
            <Button onClick={handleCalculate} disabled={isCalculating}>
              {isCalculating ? "계산 중..." : "리그 순위 계산"}
            </Button>
          ) : (
            <p className="text-sm text-gray-500">권한이 없습니다.</p>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">토너먼트 팀 배치</h2>
          <p className="text-xs text-gray-500">
            확정된 리그 순위를 기준으로 토너먼트 경기에 팀을 배치합니다.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">리그 순위</h3>
          {standings.length === 0 ? (
            <Card className="text-sm text-gray-500">순위 데이터가 없습니다.</Card>
          ) : (
            <div className="overflow-x-auto rounded border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">순위</th>
                    <th className="px-3 py-2 text-left">팀명</th>
                    <th className="px-3 py-2 text-right">승</th>
                    <th className="px-3 py-2 text-right">패</th>
                    <th className="px-3 py-2 text-right">득점</th>
                    <th className="px-3 py-2 text-right">실점</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{row.rank}</td>
                      <td className="px-3 py-2">
                        {row.teams?.team_name ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">{row.wins}</td>
                      <td className="px-3 py-2 text-right">{row.losses}</td>
                      <td className="px-3 py-2 text-right">{row.points_for}</td>
                      <td className="px-3 py-2 text-right">{row.points_against}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">토너먼트 배치 미리보기</h3>
          {preview.length === 0 ? (
            <Card className="text-sm text-gray-500">미리보기 데이터가 없습니다.</Card>
          ) : (
            <ul className="space-y-1 text-sm text-gray-700">
              {preview.map((row) => (
                <li key={`${row.seedA}-${row.seedB}`}>
                  {row.seedA}위 {row.teamAName ?? "TBD"} vs {row.seedB}위 {row.teamBName ?? "TBD"}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isOrganizer ? (
          <Button
            onClick={handleSeed}
            disabled={
              isSeeding ||
              standingsDirty ||
              !isConfirmed ||
              !tournamentSize
            }
          >
            {isSeeding ? "배치 중..." : "토너먼트 팀 배치"}
          </Button>
        ) : (
          <p className="text-sm text-gray-500">권한이 없습니다.</p>
        )}

        {!isConfirmed && (
          <p className="text-xs text-gray-500">리그 순위 확정 이후 배치할 수 있습니다.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">토너먼트 결과 입력</h2>
            <p className="text-xs text-gray-500">토너먼트 경기만 표시됩니다.</p>
          </div>
        </div>

        {tournamentCourts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">토너먼트 경기가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tournamentCourts.map((court) => (
              <Card key={court.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    🏀 {court.label}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {court.totalMatches}경기
                  </span>
                </div>

                <Card className="bg-slate-50">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {divisionName}
                    </h4>
                  </div>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    {(() => {
                      const orderedMatches = [...court.matches].sort((a, b) => {
                        const aTime = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity;
                        const bTime = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity;
                        if (aTime !== bTime) return aTime - bTime;
                        return a.id.localeCompare(b.id);
                      });

                      return (
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col className="w-24" />
                          <col className="w-28" />
                          <col className="w-auto" />
                          <col className="w-24" />
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
                            <th className="px-3 py-2 text-center">상태</th>
                            <th className="px-3 py-2 text-center">저장</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(() => {
                            const roundCounts = new Map<string, number>();
                            orderedMatches.forEach((match) => {
                              const key = match.round ?? "tournament";
                              roundCounts.set(key, (roundCounts.get(key) ?? 0) + 1);
                            });
                            const initialRound =
                              getInitialTournamentRound(roundCounts);
                            const roundIndexes = new Map<string, number>();

                            return orderedMatches.map((match) => {
                              const key = match.round ?? "tournament";
                              const nextIndex = (roundIndexes.get(key) ?? 0) + 1;
                              roundIndexes.set(key, nextIndex);
                              const roundTotal = roundCounts.get(key) ?? null;
                              const previousRound =
                                getPreviousTournamentRound(match.round ?? null);
                              const previousRoundTotal = previousRound
                                ? roundCounts.get(previousRound) ?? null
                                : null;
                              const seedA = match.team_a_id
                                ? divisionRanks[match.team_a_id] ?? null
                                : null;
                              const seedB = match.team_b_id
                                ? divisionRanks[match.team_b_id] ?? null
                                : null;
                              const matchLabel = formatTournamentMatchLabel({
                                round: match.round,
                                teamA: match.team_a?.team_name ?? "TBD",
                                teamB: match.team_b?.team_name ?? "TBD",
                                seedA,
                                seedB,
                                roundIndex: nextIndex,
                                roundTotal,
                                initialRound,
                                previousRoundTotal,
                              });
                              const canEditTournamentScore =
                                isOrganizer &&
                                isAssignedTeam(match.team_a?.team_name) &&
                                isAssignedTeam(match.team_b?.team_name);

                              return (
                                <tr key={match.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                    {formatTime(match.scheduled_at)}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                    {formatTournamentCategoryLabel(
                                      match.round,
                                      nextIndex,
                                      roundTotal
                                    )}
                                  </td>
                                  <td
                                    className="px-3 py-2 whitespace-nowrap truncate"
                                    title={matchLabel}
                                  >
                                    <span className="font-medium">{matchLabel}</span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {match.court?.name ?? "미배정"}
                                  </td>
                                  <td className="px-1 py-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                      value={tournamentScores[match.id]?.scoreA ?? ""}
                                      onChange={(event) =>
                                        handleTournamentScoreChange(
                                          match.id,
                                          "scoreA",
                                          event.target.value
                                        )
                                      }
                                      disabled={!canEditTournamentScore || isSaving}
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="px-1 py-2 text-gray-400 text-center">:</td>
                                  <td className="px-1 py-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                      value={tournamentScores[match.id]?.scoreB ?? ""}
                                      onChange={(event) =>
                                        handleTournamentScoreChange(
                                          match.id,
                                          "scoreB",
                                          event.target.value
                                        )
                                      }
                                      disabled={!canEditTournamentScore || isSaving}
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`inline-block text-xs px-2 py-0.5 rounded ${statusClass(
                                        match.status
                                      )}`}
                                    >
                                      {statusLabel(match.status)}
                                    </span>
                                    {tournamentRowMessages[match.id] && (
                                      <div
                                        className={`mt-0.5 text-xs ${
                                          tournamentRowMessages[match.id]?.tone === "error"
                                            ? "text-red-500"
                                            : "text-green-600"
                                        }`}
                                      >
                                        {tournamentRowMessages[match.id]?.text}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-center px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                      onClick={() => handleSaveTournamentMatch(match.id)}
                                      disabled={!canEditTournamentScore || isSaving || savingTournamentId === match.id}
                                    >
                                      {savingTournamentId === match.id ? "저장 중..." : "저장"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                      );
                    })()}
                  </div>
                </Card>
              </Card>
            ))}
          </div>
        )}

        {!isOrganizer && (
          <p className="text-sm text-gray-500">권한이 없습니다.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">토너먼트 진행 상태</h2>
          <p className="text-xs text-gray-500">
            라운드별 경기와 다음 라운드 배치 상태를 확인합니다.
          </p>
        </div>

        {!tournamentProgress || tournamentProgress.rounds.length === 0 ? (
          <Card className="text-sm text-gray-500">토너먼트 진행 데이터가 없습니다.</Card>
        ) : (
          <div className="space-y-4">
            {tournamentProgress.rounds.map((round) => (
              <div key={round.round}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {round.label}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {round.matches.length}경기
                  </span>
                </div>
                <div className="space-y-2">
                  {round.matches.map((match) => (
                    <div key={match.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-gray-700">
                          {match.teamAName ?? "TBD"} vs {match.teamBName ?? "TBD"}
                        </span>
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded ${statusClass(
                            match.status
                          )}`}
                        >
                          {statusLabel(match.status)}
                        </span>
                      </div>
                      {match.nextRound ? (
                        <p className="mt-1 text-xs text-gray-500">
                          다음 라운드 {roundLabelMap[match.nextRound] ?? match.nextRound} 슬롯 {match.nextSlot ?? "-"}: {match.nextAssignedTeamId ? "배치됨" : "미배치"}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">다음 라운드 없음</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {message && (
        <Card
          className={`text-sm ${
            message.tone === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {message.text}
        </Card>
      )}
    </div>
  );
}
