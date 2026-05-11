import Link from "next/link";
import { Users, Trophy, Radio } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { getTournamentStatusDisplay } from "@/lib/utils/tournament";
import type { ActiveTournamentCard } from "@/lib/types/dashboard";

type Props = {
  tournaments: ActiveTournamentCard[];
};

const APP_STATUS_LABEL: Record<string, string> = {
  payment_pending:       "입금 대기",
  paid_pending_approval: "승인 대기",
  confirmed:             "참가 확정",
  waitlisted:            "대기 중",
};

const APP_STATUS_COLOR: Record<string, string> = {
  payment_pending:       "text-amber-600",
  paid_pending_approval: "text-sky-600",
  confirmed:             "text-emerald-600",
  waitlisted:            "text-slate-500",
};


export default function ActiveTournaments({ tournaments }: Props) {
  if (tournaments.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">참가 중인 대회</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tournaments.map((t) => {
          const isResultVisible = t.tournamentStatus === "closed" || t.tournamentStatus === "finished";

          const tournamentDisplay = t.tournamentStatus
            ? getTournamentStatusDisplay(t.tournamentStatus, t.tournamentStartDate)
            : null;

          return (
            <Card key={t.applicationId} className="flex flex-col gap-4">
              {/* 헤더: 대회명 + 대회 상태 뱃지 */}
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold text-slate-800">{t.tournamentName}</p>
                {tournamentDisplay && (
                  <Badge variant={tournamentDisplay.variant} className="shrink-0">
                    {tournamentDisplay.label}
                  </Badge>
                )}
              </div>

              {/* 상태 / 부문 / 팀 */}
              <div className="rounded-lg bg-slate-50 px-3 py-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Radio className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>상태</span>
                  <span className={`ml-auto font-semibold ${APP_STATUS_COLOR[t.status] ?? "text-slate-800"}`}>
                    {APP_STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>부문</span>
                  <span className="ml-auto font-semibold text-slate-800">{t.divisionName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>팀</span>
                  <span className="ml-auto font-semibold text-slate-800">{t.teamName}</span>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2">
                <Link href={`/tournament/${t.tournamentId}`} className="flex-1">
                  <Button variant="secondary" className="w-full">대회 상세</Button>
                </Link>
                {isResultVisible && (
                  <Link href={`/tournament/${t.tournamentId}/result`} className="flex-1">
                    <Button variant="primary" className="w-full">결과 확인</Button>
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
