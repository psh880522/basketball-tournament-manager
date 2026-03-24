"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { BracketGenerationSummary } from "@/lib/api/bracket";
import { formatRoundLabel } from "@/lib/formatters/matchLabel";
import {
  createLeagueMatchesAction,
  createTournamentMatchesAction,
  updateMatchSeedAction,
} from "./actions";

type Props = {
  tournamentId: string;
  summary: BracketGenerationSummary;
};

type Message = { tone: "success" | "error"; text: string } | null;

type SeedEntry = { seedA: string; seedB: string };

const assignmentClass = (isAssigned: boolean) =>
  isAssigned
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-600";

export function BracketConsoleForm({ tournamentId, summary }: Props) {
  const divisions = summary.divisions;
  const [leagueDivisionId, setLeagueDivisionId] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [leagueMsg, setLeagueMsg] = useState<Message>(null);
  const [isLeaguePending, startLeagueTransition] = useTransition();

  const [tournamentDivisionId, setTournamentDivisionId] = useState("");
  const [tournamentSize, setTournamentSize] = useState("");
  const [tournamentMsg, setTournamentMsg] = useState<Message>(null);
  const [isTournamentPending, startTournamentTransition] = useTransition();

  const [seedValues, setSeedValues] = useState<Record<string, SeedEntry>>({});
  const [savingSeedId, setSavingSeedId] = useState<string | null>(null);
  const [seedRowMessages, setSeedRowMessages] = useState<Record<string, Message>>({});
  const [isSeedPending, startSeedTransition] = useTransition();

  const leagueDivision = useMemo(
    () => divisions.find((d) => d.id === leagueDivisionId) ?? null,
    [divisions, leagueDivisionId]
  );
  const tournamentDivision = useMemo(
    () => divisions.find((d) => d.id === tournamentDivisionId) ?? null,
    [divisions, tournamentDivisionId]
  );

  useEffect(() => {
    const initial: Record<string, SeedEntry> = {};
    summary.divisions.forEach((division) => {
      division.tournamentRounds.forEach((round) => {
        round.matches.forEach((match) => {
          initial[match.id] = {
            seedA: match.seedA !== null ? String(match.seedA) : "",
            seedB: match.seedB !== null ? String(match.seedB) : "",
          };
        });
      });
    });
    setSeedValues(initial);
  }, [summary]);

  if (divisions.length === 0) {
    return <p className="text-gray-500">등록된 디비전이 없습니다.</p>;
  }

  const handleSaveSeed = (matchId: string) => {
    const values = seedValues[matchId] ?? { seedA: "", seedB: "" };
    const seedA = values.seedA === "" ? null : Number(values.seedA);
    const seedB = values.seedB === "" ? null : Number(values.seedB);

    if (seedA !== null && (!Number.isInteger(seedA) || seedA < 1)) {
      setSeedRowMessages((prev) => ({
        ...prev,
        [matchId]: { tone: "error", text: "시드A는 1 이상의 정수여야 합니다." },
      }));
      return;
    }
    if (seedB !== null && (!Number.isInteger(seedB) || seedB < 1)) {
      setSeedRowMessages((prev) => ({
        ...prev,
        [matchId]: { tone: "error", text: "시드B는 1 이상의 정수여야 합니다." },
      }));
      return;
    }

    setSavingSeedId(matchId);
    startSeedTransition(async () => {
      const result = await updateMatchSeedAction({
        tournamentId,
        matchId,
        seedA,
        seedB,
      });
      setSavingSeedId(null);
      setSeedRowMessages((prev) => ({
        ...prev,
        [matchId]: result.ok
          ? { tone: "success", text: "저장 완료" }
          : { tone: "error", text: result.error },
      }));
      if (result.ok) {
        setTimeout(() => {
          setSeedRowMessages((prev) => ({ ...prev, [matchId]: null }));
        }, 1200);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">조/경기 생성 콘솔</h1>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">대회명</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.tournamentName}
              </p>
            </div>
            <div className="text-sm text-gray-500">디비전 {divisions.length}</div>
          </div>
          <div className="grid gap-2 text-sm">
            {divisions.map((division) => (
              <div
                key={division.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <span className="font-medium text-gray-700">{division.name}</span>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>
                    리그 경기: {division.hasLeagueMatches ? "생성됨" : "미생성"}
                  </span>
                  <span>
                    토너먼트 경기:{" "}
                    {division.hasTournamentMatches ? "생성됨" : "미생성"}
                  </span>
                  <span>
                    스케줄 준비: {division.readyForSchedule ? "가능" : "불가"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">리그 경기 생성</h2>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">디비전</label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={leagueDivisionId}
                onChange={(event) => {
                  const value = event.target.value;
                  setLeagueDivisionId(value);
                  const selected = divisions.find((d) => d.id === value);
                  setGroupSize(selected?.group_size ? String(selected.group_size) : "");
                  setLeagueMsg(null);
                }}
              >
                <option value="">선택</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">그룹 크기</label>
              <input
                type="number"
                min={2}
                className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={groupSize}
                onChange={(event) => setGroupSize(event.target.value)}
                placeholder={leagueDivision?.group_size?.toString() ?? ""}
              />
            </div>
            <Button
              onClick={() => {
                setLeagueMsg(null);
                startLeagueTransition(async () => {
                  const result = await createLeagueMatchesAction({
                    tournamentId,
                    divisionId: leagueDivisionId,
                    groupSize: Number(groupSize),
                  });
                  if (!result.ok) {
                    setLeagueMsg({ tone: "error", text: result.error });
                    return;
                  }
                  setLeagueMsg({ tone: "success", text: "리그 경기가 생성되었습니다." });
                });
              }}
              disabled={isLeaguePending}
            >
              {isLeaguePending ? "생성 중..." : "리그 경기 생성"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            선택한 디비전에 리그 경기를 생성합니다. 생성된 경기는 schedule 페이지에서
            스케줄 생성 대상으로 사용됩니다.
          </p>
          {leagueMsg && (
            <p
              className={`text-sm ${
                leagueMsg.tone === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {leagueMsg.text}
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">토너먼트 경기 생성</h2>
        <Card className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">디비전</label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={tournamentDivisionId}
                onChange={(event) => {
                  const value = event.target.value;
                  setTournamentDivisionId(value);
                  const selected = divisions.find((d) => d.id === value);
                  setTournamentSize(
                    selected?.tournament_size ? String(selected.tournament_size) : ""
                  );
                  setTournamentMsg(null);
                }}
              >
                <option value="">선택</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">토너먼트 크기</label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={tournamentSize}
                onChange={(event) => setTournamentSize(event.target.value)}
              >
                <option value="">선택</option>
                <option value="4">4강</option>
                <option value="8">8강</option>
                <option value="16">16강</option>
              </select>
            </div>
            <Button
              onClick={() => {
                setTournamentMsg(null);
                startTournamentTransition(async () => {
                  const result = await createTournamentMatchesAction({
                    tournamentId,
                    divisionId: tournamentDivisionId,
                    tournamentSize: Number(tournamentSize),
                  });
                  if (!result.ok) {
                    setTournamentMsg({ tone: "error", text: result.error });
                    return;
                  }
                  setTournamentMsg({
                    tone: "success",
                    text: "토너먼트 경기가 생성되었습니다.",
                  });
                });
              }}
              disabled={isTournamentPending}
            >
              {isTournamentPending ? "생성 중..." : "토너먼트 경기 생성"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            토너먼트 경기는 항상 미배정 상태로 생성됩니다.
          </p>
          {tournamentMsg && (
            <p
              className={`text-sm ${
                tournamentMsg.tone === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {tournamentMsg.text}
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">경기 구조 확인</h2>
        <div className="space-y-4">
          {divisions.map((division) => (
            <Card key={division.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{division.name}</h3>
                <span className="text-xs text-gray-500">
                  리그 {division.leagueMatchCount} · 토너먼트 {division.tournamentMatchCount}
                </span>
              </div>

              {division.groups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-600">조별 경기</p>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-3 py-2">조</th>
                          <th className="px-3 py-2">경기</th>
                          <th className="px-3 py-2 text-center">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {division.groups.flatMap((group) =>
                          group.matches.map((match) => (
                            <tr key={match.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {group.name}
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {match.teamAName} vs {match.teamBName}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`inline-block text-xs px-2 py-0.5 rounded ${assignmentClass(
                                    match.isAssigned
                                  )}`}
                                >
                                  {match.isAssigned ? "배정" : "미배정"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {division.tournamentRounds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-600">토너먼트 경기</p>
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col className="w-20" />
                        <col className="w-16" />
                        <col className="w-auto" />
                        <col className="w-8" />
                        <col className="w-auto" />
                        <col className="w-16" />
                        <col className="w-20" />
                        <col className="w-20" />
                      </colgroup>
                      <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <tr>
                          <th className="px-3 py-2">라운드</th>
                          <th className="px-3 py-2 text-center">시드A</th>
                          <th className="px-3 py-2">팀A</th>
                          <th className="px-3 py-2 text-center">VS</th>
                          <th className="px-3 py-2">팀B</th>
                          <th className="px-3 py-2 text-center">시드B</th>
                          <th className="px-3 py-2 text-center">상태</th>
                          <th className="px-3 py-2 text-center">저장</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {division.tournamentRounds.flatMap((round) =>
                          round.matches.map((match) => (
                            <tr key={match.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                {formatRoundLabel(round.roundName)}
                              </td>
                              <td className="px-1 py-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                  value={seedValues[match.id]?.seedA ?? ""}
                                  onChange={(event) =>
                                    setSeedValues((prev) => ({
                                      ...prev,
                                      [match.id]: {
                                        seedA: event.target.value,
                                        seedB: prev[match.id]?.seedB ?? "",
                                      },
                                    }))
                                  }
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-3 py-2">{match.teamAName}</td>
                              <td className="px-1 py-2 text-gray-400 text-center">VS</td>
                              <td className="px-3 py-2">{match.teamBName}</td>
                              <td className="px-1 py-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                                  value={seedValues[match.id]?.seedB ?? ""}
                                  onChange={(event) =>
                                    setSeedValues((prev) => ({
                                      ...prev,
                                      [match.id]: {
                                        seedA: prev[match.id]?.seedA ?? "",
                                        seedB: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`inline-block text-xs px-2 py-0.5 rounded ${assignmentClass(
                                    match.isAssigned
                                  )}`}
                                >
                                  {match.isAssigned ? "배정" : "미배정"}
                                </span>
                                {seedRowMessages[match.id] && (
                                  <div
                                    className={`mt-0.5 text-xs ${
                                      seedRowMessages[match.id]?.tone === "error"
                                        ? "text-red-500"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {seedRowMessages[match.id]?.text}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                  onClick={() => handleSaveSeed(match.id)}
                                  disabled={isSeedPending || savingSeedId === match.id}
                                >
                                  {savingSeedId === match.id ? "저장 중..." : "저장"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {division.groups.length === 0 && division.tournamentRounds.length === 0 && (
                <p className="text-xs text-gray-400">생성된 경기가 없습니다.</p>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default BracketConsoleForm;