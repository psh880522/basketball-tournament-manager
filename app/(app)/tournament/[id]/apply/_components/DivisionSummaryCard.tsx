import Link from "next/link";
import Card from "@/components/ui/Card";
import type { DivisionRow } from "@/lib/api/divisions";

type Props = {
  division: DivisionRow;
  backHref: string;
};

export default function DivisionSummaryCard({ division, backHref }: Props) {
  return (
    <Card variant="muted">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            선택된 부문
          </p>
          <p className="font-semibold text-slate-900">{division.name}</p>
          <p className="text-sm text-slate-600">
            참가비:{" "}
            {division.entry_fee === 0
              ? "무료"
              : `${division.entry_fee.toLocaleString()}원`}
            {division.capacity !== null && ` · 정원: ${division.capacity}팀`}
            {` · 최소 로스터: ${division.min_roster_size}명`}
          </p>
        </div>
        <Link
          href={backHref}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
        >
          변경 →
        </Link>
      </div>
    </Card>
  );
}
