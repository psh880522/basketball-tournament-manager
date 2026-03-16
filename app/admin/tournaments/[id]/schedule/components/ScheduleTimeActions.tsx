"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { generateScheduleTimesAction } from "../actions";

type Props = {
  tournamentId: string;
};

type Message = { tone: "success" | "error"; text: string } | null;

export default function ScheduleTimeActions({ tournamentId }: Props) {
  const router = useRouter();
  const [startTime, setStartTime] = useState("");
  const [matchMinutes, setMatchMinutes] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setMessage(null);

    if (!startTime) {
      setMessage({ tone: "error", text: "대회 시작 시간을 입력하세요." });
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
      const result = await generateScheduleTimesAction(tournamentId, {
        startTime,
        matchDurationMinutes: matchValue,
        breakDurationMinutes: breakValue,
      });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "시간 배정이 완료되었습니다." });
      router.refresh();
    });
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">시간 자동 배정</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            대회 시작 시간
          </label>
          <input
            type="datetime-local"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">경기 시간</label>
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
          <label className="text-xs font-medium text-gray-600">휴식 시간</label>
          <input
            type="number"
            min={0}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "생성 중..." : "스케줄 생성"}
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
    </Card>
  );
}
