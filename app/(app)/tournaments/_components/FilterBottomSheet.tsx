"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  current: { dateFrom?: string; dateTo?: string };
};

export default function FilterBottomSheet({ isOpen, onClose, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftDateFrom, setDraftDateFrom] = useState(current.dateFrom ?? "");
  const [draftDateTo, setDraftDateTo] = useState(current.dateTo ?? "");

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (draftDateFrom) {
      params.set("dateFrom", draftDateFrom);
    } else {
      params.delete("dateFrom");
    }
    if (draftDateTo) {
      params.set("dateTo", draftDateTo);
    } else {
      params.delete("dateTo");
    }
    router.push(`/tournaments?${params.toString()}`);
    onClose();
  };

  const handleReset = () => {
    setDraftDateFrom("");
    setDraftDateTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dateFrom");
    params.delete("dateTo");
    router.push(`/tournaments?${params.toString()}`);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-8 pt-2" aria-labelledby="filter-sheet-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="filter-sheet-title" className="text-base font-semibold text-slate-900">
            필터
          </h2>
          <button onClick={handleReset} className="text-sm text-slate-400 hover:text-slate-600">
            초기화
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">날짜 범위</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
            <span className="text-sm text-slate-400">~</span>
            <input
              type="date"
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>
        </div>
        <Button variant="primary" className="mt-6 w-full" onClick={handleApply}>
          필터 적용
        </Button>
      </div>
    </BottomSheet>
  );
}
