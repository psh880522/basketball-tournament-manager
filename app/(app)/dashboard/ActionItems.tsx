import Link from "next/link";
import { AlertCircle, Users, Shield, ChevronRight, CheckCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { PendingAction } from "@/lib/types/dashboard";

type ActionItemsProps = {
  actions: PendingAction[];
};

const ACTION_CONFIG = {
  payment: {
    Icon: AlertCircle,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-50",
  },
  roster: {
    Icon: Users,
    iconClass: "text-sky-500",
    bgClass: "bg-sky-50",
  },
  team_join_approval: {
    Icon: Shield,
    iconClass: "text-[#FF6B00]",
    bgClass: "bg-[#FF6B00]/5",
  },
} as const;

export default function ActionItems({ actions }: ActionItemsProps) {
  return (
    <section id="action-items" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          지금 해야 할 일
        </h2>
        {actions.length > 0 && (
          <Badge variant="danger">{actions.length}개</Badge>
        )}
      </div>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm">
        {actions.length === 0 ? (
          <div className="flex items-center gap-3 p-5">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">
              모든 할 일을 완료했어요
            </p>
          </div>
        ) : (
          actions.map((action, i) => {
            const { Icon, iconClass, bgClass } = ACTION_CONFIG[action.type];
            return (
              <Link
                key={i}
                href={action.href}
                className="flex items-center gap-4 p-4 transition hover:bg-slate-50"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="live" className="shrink-0">
                      {action.teamName}
                    </Badge>
                    {action.tournamentName && (
                      <span className="truncate text-xs text-slate-500">
                        {action.tournamentName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {action.label}
                  </p>
                  {action.meta && (
                    <p className="text-xs text-slate-400">{action.meta}</p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
