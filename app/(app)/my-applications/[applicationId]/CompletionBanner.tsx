"use client";

import Card from "@/components/ui/Card";

export default function CompletionBanner() {
  return (
    <Card variant="highlight">
      <div className="flex gap-4">
        <div className="shrink-0 text-2xl">🎉</div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">신청이 완료되었습니다!</p>
          <p className="mt-1 text-sm text-amber-800">
            입금 기한까지 참가비를 납부해주세요.
          </p>
          <button
            onClick={() =>
              document
                .getElementById("payment-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="mt-2 text-xs text-amber-700 underline hover:text-amber-900"
          >
            입금 안내 바로 보기 ↓
          </button>
        </div>
      </div>
    </Card>
  );
}
