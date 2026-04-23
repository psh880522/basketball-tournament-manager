"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { value: "all", label: "전체" },
  { value: "open", label: "모집중", dotColor: "#FF6B00" },
  { value: "closed", label: "진행중" },
  { value: "finished", label: "종료" },
  { value: "mine", label: "내 신청" },
];

type Props = {
  currentTab: string;
};

export default function FilterTabBar({ currentTab }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tabValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabValue === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tabValue);
    }
    router.push(`/tournaments?${params.toString()}`);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <div className="flex gap-1 min-w-max">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[#FF6B00] text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.dotColor && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: isActive ? "white" : tab.dotColor }}
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
