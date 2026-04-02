"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { DivisionRow } from "@/lib/api/divisions";
import {
  seedGroupMatchSlotsAction,
  seedTournamentMatchSlotsAction,
  seedBreakSlotsAction,
} from "../actions";

type Props = {
  tournamentId: string;
  divisions: DivisionRow[];
};

type Message = { tone: "success" | "error"; text: string } | null;

export default function ScheduleSeedActions({ tournamentId, divisions }: Props) {
  const router = useRouter();

  const [groupDivisionId, setGroupDivisionId] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [groupMsg, setGroupMsg] = useState<Message>(null);
  const [isGroupPending, startGroupTransition] = useTransition();

  const [tournamentDivisionId, setTournamentDivisionId] = useState("");
  const [tournamentSize, setTournamentSize] = useState("");
  const [assignToTournament, setAssignToTournament] = useState(false);
  const [tournamentMsg, setTournamentMsg] = useState<Message>(null);
  const [isTournamentPending, startTournamentTransition] = useTransition();

  const [breakDivisionId, setBreakDivisionId] = useState("");
  const [breakStageType, setBreakStageType] = useState<"group" | "tournament">(
    "group"
  );
  const [breakMsg, setBreakMsg] = useState<Message>(null);
  const [isBreakPending, startBreakTransition] = useTransition();

  const groupDivision = useMemo(
    () => divisions.find((d) => d.id === groupDivisionId) ?? null,
    [divisions, groupDivisionId]
  );

  const tournamentDivision = useMemo(
    () => divisions.find((d) => d.id === tournamentDivisionId) ?? null,
    [divisions, tournamentDivisionId]
  );

  const resetMessages = () => {
    setGroupMsg(null);
    setTournamentMsg(null);
    setBreakMsg(null);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">리그 경기 생성</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">디비전</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={groupDivisionId}
              onChange={(event) => {
                const value = event.target.value;
                setGroupDivisionId(value);
                const selected = divisions.find((d) => d.id === value);
                setGroupSize(
                  selected?.group_size ? String(selected.group_size) : ""
                );
                setGroupMsg(null);
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
              placeholder={groupDivision?.group_size?.toString() ?? ""}
            />
          </div>
          <Button
            onClick={() => {
              resetMessages();
              startGroupTransition(async () => {
                const result = await seedGroupMatchSlotsAction(
                  tournamentId,
                  groupDivisionId,
                  Number(groupSize)
                );
                if (!result.ok) {
                  setGroupMsg({ tone: "error", text: result.error });
                  return;
                }
                setGroupMsg({ tone: "success", text: "리그 경기가 생성되었습니다." });
                router.refresh();
              });
            }}
            disabled={isGroupPending}
          >
            {isGroupPending ? "생성 중..." : "생성"}
          </Button>
        </div>
        {groupDivision && (
          <p className="text-xs text-gray-500">
            기본값: group_size {groupDivision.group_size ?? "-"}
          </p>
        )}
        {groupMsg && (
          <p
            className={`text-sm ${
              groupMsg.tone === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {groupMsg.text}
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">토너먼트 경기 생성</h2>
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
                  selected?.tournament_size
                    ? String(selected.tournament_size)
                    : ""
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
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={assignToTournament}
              onChange={(event) => setAssignToTournament(event.target.checked)}
            />
            토너먼트 대회
          </label>
          <Button
            onClick={() => {
              resetMessages();
              startTournamentTransition(async () => {
                const result = await seedTournamentMatchSlotsAction(
                  tournamentId,
                  tournamentDivisionId,
                  Number(tournamentSize),
                  assignToTournament
                );
                if (!result.ok) {
                  setTournamentMsg({ tone: "error", text: result.error });
                  return;
                }
                setTournamentMsg({
                  tone: "success",
                  text: "토너먼트 슬롯이 생성되었습니다.",
                });
                router.refresh();
              });
            }}
            disabled={isTournamentPending}
          >
            {isTournamentPending ? "생성 중..." : "생성"}
          </Button>
        </div>
        {tournamentDivision && (
          <p className="text-xs text-gray-500">
            기본값: tournament_size {tournamentDivision.tournament_size ?? "-"}
          </p>
        )}
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

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">휴식시간 생성</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">디비전</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={breakDivisionId}
              onChange={(event) => {
                setBreakDivisionId(event.target.value);
                setBreakMsg(null);
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
            <label className="text-xs font-medium text-gray-600">섹션</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={breakStageType}
              onChange={(event) =>
                setBreakStageType(event.target.value as "group" | "tournament")
              }
            >
              <option value="group">group</option>
              <option value="tournament">tournament</option>
            </select>
          </div>
          <Button
            onClick={() => {
              resetMessages();
              startBreakTransition(async () => {
                const result = await seedBreakSlotsAction(
                  tournamentId,
                  breakDivisionId,
                  breakStageType
                );
                if (!result.ok) {
                  setBreakMsg({ tone: "error", text: result.error });
                  return;
                }
                setBreakMsg({ tone: "success", text: "휴식시간이 추가되었습니다." });
                router.refresh();
              });
            }}
            disabled={isBreakPending}
          >
            {isBreakPending ? "생성 중..." : "생성"}
          </Button>
        </div>
        {breakMsg && (
          <p
            className={`text-sm ${
              breakMsg.tone === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {breakMsg.text}
          </p>
        )}
      </Card>
    </div>
  );
}
