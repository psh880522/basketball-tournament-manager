"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  clearScheduleSyncAction,
  syncScheduleToMatchesAction,
  validateScheduleBeforeSyncAction,
} from "../actions";

type Props = {
  tournamentId: string;
};

type Message = { tone: "success" | "error"; text: string } | null;
type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export default function ScheduleSyncActions({ tournamentId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleValidate = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await validateScheduleBeforeSyncAction(tournamentId);
      setValidation(result);
      if (!result.isValid) {
        setMessage({ tone: "error", text: "검증에 실패했습니다." });
        return;
      }
      setMessage({ tone: "success", text: "검증이 완료되었습니다." });
    });
  };

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      const validationResult = await validateScheduleBeforeSyncAction(tournamentId);
      setValidation(validationResult);
      if (!validationResult.isValid) {
        setMessage({ tone: "error", text: "검증에 실패했습니다." });
        return;
      }
      const result = await syncScheduleToMatchesAction(tournamentId);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "동기화가 완료되었습니다." });
      router.refresh();
    });
  };

  const handleClear = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await clearScheduleSyncAction(tournamentId);
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
      <h2 className="text-lg font-semibold">동기화</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleValidate} disabled={isPending}>
          {isPending ? "검증 중..." : "검증"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending || (validation ? !validation.isValid : false)}
        >
          {isPending ? "동기화 중..." : "동기화 저장"}
        </Button>
        <Button variant="secondary" onClick={handleClear} disabled={isPending}>
          동기화 초기화
        </Button>
      </div>
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2 text-sm">
          {validation.errors.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-red-600">오류</p>
              <ul className="list-disc pl-5 text-red-600">
                {validation.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-amber-600">경고</p>
              <ul className="list-disc pl-5 text-amber-600">
                {validation.warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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
