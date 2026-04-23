"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

type Props = {
  dateFrom?: string;
  dateTo?: string;
};

export default function FilterChips({ dateFrom, dateTo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!dateFrom && !dateTo) return null;

  const clearParams = (keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => params.delete(k));
    router.push(`/tournaments?${params.toString()}`);
  };

  const clearAll = () => clearParams(["dateFrom", "dateTo"]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(dateFrom || dateTo) && (
        <button
          onClick={() => clearParams(["dateFrom", "dateTo"])}
          className="flex items-center gap-1 rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium text-[#FF6B00] hover:bg-[#FF6B00]/20"
        >
          날짜: {dateFrom ?? "??"} ~ {dateTo ?? "??"}
          <X size={12} />
        </button>
      )}
      <button
        onClick={clearAll}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        전체 초기화
      </button>
    </div>
  );
}
