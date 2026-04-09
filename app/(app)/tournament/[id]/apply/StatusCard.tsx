"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { MyApplicationRow } from "@/lib/api/applications";
import { markPaymentDoneAction, cancelApplicationAction } from "./actions";

const statusBadge: Record<string, { text: string; className: string }> = {
  payment_pending: { text: "입금 대기", className: "bg-yellow-100 text-yellow-800" },
  paid_pending_approval: { text: "승인 대기", className: "bg-blue-100 text-blue-800" },
  confirmed: { text: "참가 확정", className: "bg-green-100 text-green-700" },
  waitlisted: { text: "대기열", className: "bg-orange-100 text-orange-700" },
  expired: { text: "만료됨", className: "bg-gray-100 text-gray-500" },
  cancelled: { text: "취소됨", className: "bg-red-100 text-red-700" },
};

export default function StatusCard({
  app,
  tournamentId,
}: {
  app: MyApplicationRow;
  tournamentId: string;
}) {
  const router = useRouter();
  const badge = statusBadge[app.status] ?? statusBadge.payment_pending;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">참가 신청 현황</h2>
        <Badge className={badge.className}>{badge.text}</Badge>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">팀:</span> {app.team_name}
        </p>
        <p>
          <span className="font-medium text-gray-800">부문:</span>{" "}
          {app.division_name}
        </p>
        {app.final_amount != null && app.final_amount > 0 && (
          <p>
            <span className="font-medium text-gray-800">참가비:</span>{" "}
            {app.final_amount.toLocaleString()}원
          </p>
        )}
      </div>

      {app.status === "payment_pending" && app.final_amount > 0 && (
        <PaymentSection app={app} tournamentId={tournamentId} onRefresh={() => router.refresh()} />
      )}

      {app.status === "payment_pending" && app.final_amount === 0 && (
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          신청이 완료되었습니다. 운영자 확인 후 참가가 확정됩니다.
          {app.payment_due_at && (
            <p className="mt-1 text-xs text-yellow-700">
              확인 기한:{" "}
              {new Date(app.payment_due_at).toLocaleString("ko-KR", {
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}

      {app.status === "paid_pending_approval" && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          입금 확인 후 운영자가 참가를 확정합니다. 잠시 기다려주세요.
          {app.depositor_name && (
            <p className="mt-1 text-xs text-blue-600">
              입금자명: {app.depositor_name}
            </p>
          )}
        </div>
      )}

      {app.status === "confirmed" && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          참가가 확정되었습니다. 대회 당일 참가해주세요!
          {app.confirmed_at && (
            <p className="mt-1 text-xs text-green-600">
              확정일: {new Date(app.confirmed_at).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
      )}

      {app.status === "waitlisted" && (
        <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
          현재 대기 중입니다.
          {app.waitlist_position != null && (
            <span className="ml-1 font-semibold">
              (대기 순번: {app.waitlist_position}번)
            </span>
          )}
          <p className="mt-1 text-xs">빈 자리가 생기면 자동으로 신청 처리됩니다.</p>
        </div>
      )}

      {app.status === "expired" && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          입금 기한이 만료되어 신청이 취소되었습니다.
          <p className="mt-1 text-xs">다시 신청하시려면 새로 접수해주세요.</p>
        </div>
      )}

      {app.status === "cancelled" && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          참가 신청이 취소되었습니다.
          {app.cancelled_at && (
            <p className="mt-1 text-xs">
              취소일: {new Date(app.cancelled_at).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
      )}

      {(app.status === "payment_pending" || app.status === "paid_pending_approval") && (
        <CancelSection app={app} tournamentId={tournamentId} onRefresh={() => router.refresh()} />
      )}
    </Card>
  );
}

function PaymentSection({
  app,
  tournamentId,
  onRefresh,
}: {
  app: MyApplicationRow;
  tournamentId: string;
  onRefresh: () => void;
}) {
  const [depositorName, setDepositorName] = useState("");
  const [depositorNote, setDepositorNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dueDate = app.payment_due_at
    ? new Date(app.payment_due_at).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositorName.trim()) {
      setError("입금자명을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      const result = await markPaymentDoneAction(tournamentId, {
        applicationId: app.id,
        depositorName: depositorName.trim(),
        depositorNote: depositorNote.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onRefresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg bg-yellow-50 p-3">
      <p className="text-sm font-medium text-yellow-800">
        참가비 계좌이체 후 아래에 입금 완료를 신고해주세요.
      </p>
      <p className="text-sm font-semibold text-yellow-900">
        금액: {app.final_amount.toLocaleString()}원
      </p>
      {dueDate && (
        <p className="text-xs text-yellow-700">입금 기한: {dueDate}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="text-xs font-medium text-gray-700">
            입금자명 <span className="text-red-500">*</span>
          </label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            value={depositorName}
            onChange={(e) => setDepositorName(e.target.value)}
            placeholder="계좌 이체 시 입력한 이름"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">메모 (선택)</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            value={depositorNote}
            onChange={(e) => setDepositorNote(e.target.value)}
            placeholder="추가 전달 사항"
            disabled={isPending}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" disabled={isPending || !depositorName.trim()}>
          {isPending ? "처리 중..." : "입금 완료 신고"}
        </Button>
      </form>
    </div>
  );
}

function CancelSection({
  app,
  tournamentId,
  onRefresh,
}: {
  app: MyApplicationRow;
  tournamentId: string;
  onRefresh: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirm) {
    return (
      <button
        className="text-xs text-gray-400 underline hover:text-red-500"
        onClick={() => setConfirm(true)}
      >
        신청 취소
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 p-3 text-sm">
      <p className="font-medium text-red-700">정말 신청을 취소하시겠습니까?</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            startTransition(async () => {
              const result = await cancelApplicationAction(app.id, tournamentId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onRefresh();
            });
          }}
          disabled={isPending}
        >
          {isPending ? "처리 중..." : "취소 확인"}
        </Button>
        <Button variant="secondary" onClick={() => setConfirm(false)} disabled={isPending}>
          돌아가기
        </Button>
      </div>
    </div>
  );
}
