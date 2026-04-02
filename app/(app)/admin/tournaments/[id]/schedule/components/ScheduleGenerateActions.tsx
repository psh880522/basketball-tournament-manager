"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  clearGeneratedScheduleSlotsAction,
  generateScheduleSlotsAction,
  addBreakSlotAction,
} from "../actions";

type Props = {
  tournamentId: string;
  scheduleStartAt: string | null;
  courts: Array<{ id: string; name: string }>;
  divisions: Array<{ id: string; name: string }>;
};

type Message = { tone: "success" | "error"; text: string } | null;

function formatScheduleStartAt(isoString: string | null): string {
  if (!isoString) return "미설정";
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduleGenerateActions({
  tournamentId,
  scheduleStartAt,
  courts,
  divisions,
}: Props) {
  const router = useRouter();
  const [matchMinutes, setMatchMinutes] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const [breakCourtId, setBreakCourtId] = useState(courts[0]?.id ?? "");
  const [breakDivisionId, setBreakDivisionId] = useState(divisions[0]?.id ?? "");
  const [breakMessage, setBreakMessage] = useState<Message>(null);
  const [isBreakPending, startBreakTransition] = useTransition();

  const handleGenerate = () => {
    setMessage(null);

    if (!scheduleStartAt) {
      setMessage({
        tone: "error",
        text: "대회 편집 페이지에서 대회 시작 시간을 먼저 설정하세요.",
      });
      return;
    }

    const matchValue = Number(matchMinutes);
    const breakValue = Number(breakMinutes);

    if (!Number.isFinite(matchValue) || matchValue <= 0) {
      setMessage({ tone: "error", text: "경기 시간은 1분 이상이어야 합니다." });
      return;
    }

    if (!Number.isFinite(breakValue) || breakValue < 0) {
      setMessage({ tone: "error", text: "휴식 시간은 0분 이상이어야 합니다." });
      return;
    }

    startTransition(async () => {
      const result = await generateScheduleSlotsAction(tournamentId, {
        startTime: scheduleStartAt,
        matchDurationMinutes: matchValue,
        breakDurationMinutes: breakValue,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "스케줄이 생성되었습니다." });
      router.refresh();
    });
  };

  const handleClear = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await clearGeneratedScheduleSlotsAction(tournamentId);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "스케줄이 초기화되었습니다." });
      router.refresh();
    });
  };

  const handleAddBreakSlot = () => {
    setBreakMessage(null);

    if (!breakCourtId) {
      setBreakMessage({ tone: "error", text: "코트를 선택하세요." });
      return;
    }
    if (!breakDivisionId) {
      setBreakMessage({ tone: "error", text: "디비전을 선택하세요." });
      return;
    }

    startBreakTransition(async () => {
      const result = await addBreakSlotAction(
        tournamentId,
        breakCourtId,
        breakDivisionId
      );
      if (!result.ok) {
        setBreakMessage({ tone: "error", text: result.error });
        return;
      }
      setBreakMessage({ tone: "success", text: "휴식 슬롯이 추가되었습니다." });
      router.refresh();
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">스케줄 생성</h2>
      <p className="text-sm text-gray-500">경기 시간과 휴식 시간을 설정해 코트별 스케줄 을 자동으로 생성합니다.</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-600">대회 시작 시간:</span>
        <span className={scheduleStartAt ? "text-gray-900" : "text-amber-600 font-medium"}>
          {formatScheduleStartAt(scheduleStartAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            경기 시간 (분)
          </label>
          <input
            type="number"
            min={1}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={matchMinutes}
            onChange={(event) => setMatchMinutes(event.target.value)}
            placeholder="30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            휴식 시간 (분)
          </label>
          <input
            type="number"
            min={0}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
        </div>
        <Button onClick={handleGenerate} disabled={isPending}>
          {isPending ? "생성 중..." : "생성"}
        </Button>
        <Button variant="secondary" onClick={handleClear} disabled={isPending}>
          초기화
        </Button>
      </div>
      {message && (
        <p
          className={`text-sm ${
            message.tone === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {courts.length > 0 && divisions.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">휴식 스케줄 추가</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">코트</label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={breakCourtId}
                onChange={(event) => setBreakCourtId(event.target.value)}
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                디비전
              </label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={breakDivisionId}
                onChange={(event) => setBreakDivisionId(event.target.value)}
              >
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={handleAddBreakSlot}
              disabled={isBreakPending}
            >
              {isBreakPending ? "추가 중..." : "추가"}
            </Button>
          </div>
          {breakMessage && (
            <p
              className={`text-sm ${
                breakMessage.tone === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {breakMessage.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
