"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { clearScheduleAction, saveScheduleAction } from "../actions";

type Props = {
  tournamentId: string;
};

type Message = { tone: "success" | "error"; text: string } | null;

export default function ScheduleSyncActions({ tournamentId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await saveScheduleAction(tournamentId);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "스케줄이 저장되었습니다." });
      router.refresh();
    });
  };

  const handleClear = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await clearScheduleAction(tournamentId);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({
        tone: "success",
        text: "스케줄 동기화가 초기화되었습니다.",
      });
      router.refresh();
    });
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">스케줄 동기화</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
        <Button variant="secondary" onClick={handleClear} disabled={isPending}>
          스케줄 동기화 초기화
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
