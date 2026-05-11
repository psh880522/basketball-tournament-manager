import type { DashboardSummary } from "@/lib/types/dashboard";

type SummaryCardsProps = {
  summary: DashboardSummary;
};

const CARDS = [
  { key: "teamCount" as const, label: "소속 팀" },
  { key: "captainTeamCount" as const, label: "내가 만든 팀" },
  { key: "activeApplicationCount" as const, label: "진행 중 대회" },
  { key: "thisWeekMatchCount" as const, label: "이번 주 경기" },
  { key: "pendingActionCount" as const, label: "확인 필요" },
];

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card, i) => {
        const value = summary[card.key];
        const isAction = card.key === "pendingActionCount";
        const hasAlert = isAction && value > 0;

        return (
          <div
            key={card.key}
            className={[
              "rounded-xl p-4 shadow-sm transition",
              i === 4 ? "col-span-2 sm:col-span-1" : "",
              hasAlert
                ? "border border-[#FF6B00]/20 bg-[#FF6B00]/5"
                : "bg-white",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <p
              className={[
                "text-2xl font-bold",
                hasAlert ? "text-[#FF6B00]" : "text-slate-800",
              ].join(" ")}
            >
              {value}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
