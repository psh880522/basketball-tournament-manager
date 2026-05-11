"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { type TournamentStatus } from "@/lib/api/tournaments";
import { updateTournamentStatusAction } from "../actions";

type PublishTabProps = {
  tournamentId: string;
  currentStatus: TournamentStatus;
  divisionCount: number;
  totalConfirmed: number;
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "초안",
  open: "공개",
  closed: "마감",
  finished: "종료",
};

const STATUS_COLORS: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-700",
  closed: "bg-yellow-100 text-yellow-700",
  finished: "bg-blue-100 text-blue-700",
};

export default function PublishTab({
  tournamentId,
  currentStatus,
  divisionCount,
  totalConfirmed,
}: PublishTabProps) {
  const [status, setStatus] = useState<TournamentStatus>(currentStatus);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();

  const handleStatusChange = (nextStatus: TournamentStatus) => {
    setStatusError(null);
    setStatusSuccess(null);
    startStatusTransition(async () => {
      const result = await updateTournamentStatusAction(tournamentId, nextStatus);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      setStatus(nextStatus);
      setStatusSuccess(`상태가 "${STATUS_LABELS[nextStatus]}"으로 변경되었습니다.`);
      window.setTimeout(() => setStatusSuccess(null), 2000);
    });
  };

  const hasConfirmedTeams = totalConfirmed > 0;
  const showWarning = (status === "open" || status === "closed") && hasConfirmedTeams;

  return (
    <Card className="space-y-6">
      <h2 className="text-base font-semibold">공개설정</h2>

      {/* 현재 상태 */}
      <div className="space-y-3">
        <p className="text-sm font-medium">현재 대회 상태</p>
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>

        {showWarning && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">
            이미 신청한 팀이 있습니다. (확정 {totalConfirmed}팀)
          </p>
        )}

        {statusError && <p className="text-sm text-red-600">{statusError}</p>}
        {statusSuccess && <p className="text-sm text-green-600">{statusSuccess}</p>}

        {/* 상태 전환 버튼 */}
        <div className="flex flex-wrap gap-2 pt-1">
          {status === "draft" && (
            <Button
              type="button"
              onClick={() => handleStatusChange("open")}
              disabled={isStatusPending || divisionCount === 0}
            >
              {isStatusPending ? "처리 중..." : "공개로 전환"}
            </Button>
          )}
          {status === "draft" && divisionCount === 0 && (
            <p className="self-center text-xs text-gray-400">
              디비전을 1개 이상 추가해야 공개할 수 있습니다.
            </p>
          )}
          {status === "open" && (
            <>
              <Button
                type="button"
                onClick={() => handleStatusChange("closed")}
                disabled={isStatusPending}
              >
                {isStatusPending ? "처리 중..." : "마감으로 전환"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleStatusChange("draft")}
                disabled={isStatusPending}
              >
                {isStatusPending ? "처리 중..." : "초안으로 되돌리기"}
              </Button>
            </>
          )}
          {status === "closed" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatusChange("open")}
              disabled={isStatusPending}
            >
              {isStatusPending ? "처리 중..." : "공개로 되돌리기"}
            </Button>
          )}
        </div>
      </div>

    </Card>
  );
}
