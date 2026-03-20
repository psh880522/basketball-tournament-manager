"use client";

import { useMemo, useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { BracketGenerationSummary } from "@/lib/api/bracket";
import {
  createLeagueMatchesAction,
  createTournamentMatchesAction,
} from "./actions";

type Props = {
  tournamentId: string;
  summary: BracketGenerationSummary;
};

type Message = { tone: "success" | "error"; text: string } | null;

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

  const leagueDivision = useMemo(
    () => divisions.find((d) => d.id === leagueDivisionId) ?? null,
    [divisions, leagueDivisionId]
  );
  const tournamentDivision = useMemo(
    () => divisions.find((d) => d.id === tournamentDivisionId) ?? null,
    [divisions, tournamentDivisionId]
  );

  if (divisions.length === 0) {
    return <p className="text-gray-500">등록된 디비전이 없습니다.</p>;
  }

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
            <div className="text-sm text-gray-500">
              디비전 {divisions.length}
            </div>
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
              <label className="text-xs font-medium text-gray-600">
                토너먼트 크기
              </label>
              <input
                type="number"
                min={2}
                className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={tournamentSize}
                onChange={(event) => setTournamentSize(event.target.value)}
                placeholder={tournamentDivision?.tournament_size?.toString() ?? ""}
              />
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
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <p>같은 디비전에 리그 경기가 이미 있으면:</p>
            <p>- 토너먼트 경기만 생성되며 팀은 미배정 상태로 생성됩니다.</p>
            <p>리그 경기가 없으면:</p>
            <p>- 일반 토너먼트처럼 팀이 배정된 상태로 생성됩니다.</p>
          </div>
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
        <h2 className="text-xl font-semibold">생성 결과 요약</h2>
        <Card className="space-y-2">
          {divisions.map((division) => (
            <div
              key={division.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-100 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-700">{division.name}</span>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>
                  리그 경기: {division.hasLeagueMatches ? "생성됨" : "미생성"}
                </span>
                <span>
                  토너먼트 경기: {division.hasTournamentMatches ? "생성됨" : "미생성"}
                </span>
                <span>
                  미배정 토너먼트: {division.hasUnassignedTournament ? "있음" : "없음"}
                </span>
              </div>
            </div>
          ))}
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

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">조별 경기</p>
                {division.groups.length === 0 ? (
                  <p className="text-xs text-gray-400">생성된 조 경기가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {division.groups.map((group) => (
                      <div key={group.name} className="rounded border border-gray-100 p-2">
                        <p className="text-xs font-semibold text-gray-600">
                          {group.name}
                        </p>
                        <div className="mt-1 space-y-1 text-xs text-gray-500">
                          {group.matches.map((match) => (
                            <p key={match.id}>
                              {match.teamAName} vs {match.teamBName}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">토너먼트</p>
                {division.tournamentRounds.length === 0 ? (
                  <p className="text-xs text-gray-400">생성된 토너먼트 경기가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {division.tournamentRounds.map((round) => (
                      <div key={round.round} className="rounded border border-gray-100 p-2">
                        <p className="text-xs font-semibold text-gray-600">
                          {round.round}
                        </p>
                        <div className="mt-1 space-y-1 text-xs text-gray-500">
                          {round.matches.map((match) => (
                            <p key={match.id}>
                              {match.teamAName} vs {match.teamBName} ·
                              {match.isAssigned ? " 배정" : " 미배정"}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default BracketConsoleForm;