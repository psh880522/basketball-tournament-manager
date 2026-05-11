"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import type { DivisionRow } from "@/lib/api/divisions";
import type { MyApplicationRow } from "@/lib/api/applications";
import type { TournamentStatus } from "@/lib/api/tournaments";

type Props = {
  selectedDivision: DivisionRow | null;
  myApplication: MyApplicationRow | null;
  tournamentId: string;
  tournamentStatus: TournamentStatus;
  isLoggedIn: boolean;
  isSingleDivision: boolean;
  onOpen: () => void;
};

const ACTIVE_STATUSES = ["payment_pending", "paid_pending_approval", "confirmed", "waitlisted"];

export default function MobileApplyBar({
  selectedDivision,
  myApplication,
  tournamentId,
  tournamentStatus,
  isLoggedIn,
  isSingleDivision,
  onOpen,
}: Props) {
  const hasActiveApplication =
    myApplication !== null && ACTIVE_STATUSES.includes(myApplication.status);

  const applyHref = selectedDivision
    ? isLoggedIn
      ? `/tournament/${tournamentId}/apply?division=${selectedDivision.id}`
      : "/login"
    : "#";

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden">
      {/* 왼쪽: 상태 표시 */}
      <div className="min-w-0 flex-1">
        {hasActiveApplication ? (
          <p className="truncate text-sm font-semibold text-slate-900">
            {myApplication!.division_name}
          </p>
        ) : selectedDivision ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-900">
              {selectedDivision.name}
            </p>
            <p className="text-xs text-slate-500">
              {selectedDivision.entry_fee === 0
                ? "무료"
                : `${selectedDivision.entry_fee.toLocaleString()}원`}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">부문을 선택하세요</p>
        )}
      </div>

      {/* 오른쪽: 버튼 */}
      {hasActiveApplication ? (
        <Link href={`/my-applications/${myApplication!.id}`} className="shrink-0">
          <Button variant="secondary">신청 현황 보기</Button>
        </Link>
      ) : tournamentStatus === "open" ? (
        isSingleDivision ? (
          <Link href={applyHref} className="shrink-0">
            <Button variant="primary">신청하기 →</Button>
          </Link>
        ) : (
          <Button
            variant="primary"
            className="shrink-0"
            onClick={onOpen}
          >
            신청하기 →
          </Button>
        )
      ) : null}
    </div>
  );
}
