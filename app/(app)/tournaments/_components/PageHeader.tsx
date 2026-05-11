"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import FilterBottomSheet from "./FilterBottomSheet";

type Props = {
  activeFilterCount: number;
  current: { dateFrom?: string; dateTo?: string };
};

export default function PageHeader({ activeFilterCount, current }: Props) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">대회 탐색</h1>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="md:hidden flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Filter size={14} />
          필터
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </header>
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        current={current}
      />
    </>
  );
}
