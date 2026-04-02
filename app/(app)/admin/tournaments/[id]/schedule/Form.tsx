"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  clearScheduleAction,
  generateScheduleTimesAction,
  saveScheduleAction,
} from "./actions";

type ScheduleTimeFormProps = {
  tournamentId: string;
};

type Message = { tone: "success" | "error"; text: string } | null;

export default function ScheduleForm({ tournamentId }: ScheduleTimeFormProps) {
  const router = useRouter();
  const [startTime, setStartTime] = useState("");
  const [matchDuration, setMatchDuration] = useState("30");
  const [breakDuration, setBreakDuration] = useState("10");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<Message>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();

  const handleSubmit = () => {
    setMessage(null);

    const matchMinutes = Number(matchDuration);
    const breakMinutes = Number(breakDuration);

    if (!startTime) {
      setMessage({ tone: "error", text: "시작 시간을 입력하세요." });
      return;
    }
    if (!matchMinutes || matchMinutes <= 0) {
      setMessage({ tone: "error", text: "경기 시간은 1분 이상이어야 합니다." });
      return;
    }
    if (breakMinutes < 0) {
      setMessage({ tone: "error", text: "휴식 시간은 0분 이상이어야 합니다." });
      return;
    }

    const startTimeIso = new Date(startTime).toISOString();

    startTransition(async () => {
      const result = await generateScheduleTimesAction(tournamentId, {
        startTime: startTimeIso,
        matchDurationMinutes: matchMinutes,
        breakDurationMinutes: breakMinutes,
      });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "스케줄이 생성되었습니다." });
      router.refresh();
    });
  };

  const handleSaveSchedule = () => {
    setSyncMessage(null);
    startSaveTransition(async () => {
      const result = await saveScheduleAction(tournamentId);
      if (!result.ok) {
        setSyncMessage({ tone: "error", text: result.error });
        return;
      }
      setSyncMessage({ tone: "success", text: "스케줄이 저장되었습니다." });
      router.refresh();
    });
  };

  const handleClearSchedule = () => {
    setSyncMessage(null);
    startClearTransition(async () => {
      const result = await clearScheduleAction(tournamentId);
      if (!result.ok) {
        setSyncMessage({ tone: "error", text: result.error });
        return;
      }
      setSyncMessage({ tone: "success", text: "스케줄이 초기화되었습니다." });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
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
              value={matchDuration}
              onChange={(event) => setMatchDuration(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">휴식 시간</label>
            <input
              type="number"
              min={0}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={breakDuration}
              onChange={(event) => setBreakDuration(event.target.value)}
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

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">스케줄 저장</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSaveSchedule} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleClearSchedule}
            disabled={isClearing}
          >
            {isClearing ? "초기화 중..." : "스케줄 초기화"}
          </Button>
        </div>
        {syncMessage && (
          <p
            className={`text-sm ${
              syncMessage.tone === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {syncMessage.text}
          </p>
        )}
      </Card>
    </div>
  );
}
