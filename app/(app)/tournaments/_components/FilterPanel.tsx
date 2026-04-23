"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  current: { dateFrom?: string; dateTo?: string };
};

export default function FilterPanel({ current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/tournaments?${params.toString()}`);
  };

  return (
    <div className="hidden md:flex flex-wrap items-center gap-3">
      <span className="text-sm text-slate-500">날짜</span>
      <input
        type="date"
        value={current.dateFrom ?? ""}
        onChange={(e) => handleChange("dateFrom", e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
      />
      <span className="text-sm text-slate-400">~</span>
      <input
        type="date"
        value={current.dateTo ?? ""}
        onChange={(e) => handleChange("dateTo", e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
      />
    </div>
  );
}
