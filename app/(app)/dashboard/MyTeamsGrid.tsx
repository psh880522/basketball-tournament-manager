import Link from "next/link";
import { Calendar } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DragScroll from "@/components/ui/DragScroll";
import type { MyTeamWithApplications } from "@/lib/types/dashboard";

type MyTeamsGridProps = {
  teams: MyTeamWithApplications[];
};

const APP_STATUS_LABEL: Record<string, string> = {
  payment_pending: "입금 대기",
  paid_pending_approval: "승인 대기",
  confirmed: "참가 확정",
  waitlisted: "대기자 명단",
  cancelled: "취소됨",
  expired: "만료됨",
};

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "live";

const APP_STATUS_BADGE: Record<string, BadgeVariant> = {
  payment_pending: "warning",
  paid_pending_approval: "info",
  confirmed: "success",
  waitlisted: "default",
  cancelled: "danger",
  expired: "default",
};

function formatMatchDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function MyTeamsGrid({ teams }: MyTeamsGridProps) {
  const isMultiple = teams.length >= 3;
  const Wrapper = isMultiple ? DragScroll : "div";
  const wrapperClass = isMultiple
    ? "flex gap-4 overflow-x-auto pb-1"
    : "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <section id="my-teams" className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">내 팀들</h2>
      <Wrapper className={wrapperClass}>
        {teams.map((team) => {
          const isCaptain = team.roleInTeam === "captain";
          const activeApps = team.activeApplications.filter(
            (a) => a.status !== "cancelled" && a.status !== "expired"
          );
          const hasUrgentAction = activeApps.some(
            (a) => a.status === "payment_pending"
          );

          const nextMatch = activeApps
            .map((a) => a.nextMatch)
            .filter(Boolean)
            .sort((a, b) =>
              new Date(a!.scheduledAt).getTime() - new Date(b!.scheduledAt).getTime()
            )[0];

          return (
            <Card key={team.teamId} className={`flex flex-col gap-4 ${isMultiple ? "w-72 shrink-0" : "w-full"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{team.teamName}</span>
                  <Badge variant={isCaptain ? "live" : "default"}>
                    {isCaptain ? "팀장" : "팀원"}
                  </Badge>
                </div>
                {hasUrgentAction && (
                  <Badge variant="warning" className="shrink-0">액션 필요</Badge>
                )}
              </div>

              {activeApps.length === 0 ? (
                <p className="text-xs text-slate-400">참가 중인 대회 없음</p>
              ) : (
                <div className="space-y-2">
                  {activeApps.map((app) => (
                    <Link
                      key={app.applicationId}
                      href={`/tournament/${app.tournamentId}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-700">
                          {app.tournamentName}
                        </p>
                        <p className="text-xs text-slate-400">{app.divisionName}</p>
                      </div>
                      <Badge variant={APP_STATUS_BADGE[app.status] ?? "default"}>
                        {APP_STATUS_LABEL[app.status] ?? app.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {nextMatch && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">다음 경기</p>
                    <p className="truncate text-xs font-medium text-slate-700">
                      {formatMatchDate(nextMatch.scheduledAt)} vs {nextMatch.opponentTeamName}
                    </p>
                  </div>
                </div>
              )}

              <Link href={`/teams/${team.teamId}`} className="mt-auto self-start">
                <Button variant="secondary">팀 상세 보기</Button>
              </Link>
            </Card>
          );
        })}
      </Wrapper>
    </section>
  );
}
