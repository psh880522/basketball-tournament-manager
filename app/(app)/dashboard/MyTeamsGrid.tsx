import Link from "next/link";
import { Users, Trophy, ClipboardCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DragScroll from "@/components/ui/DragScroll";
import type { MyTeamWithApplications } from "@/lib/types/dashboard";

type MyTeamsGridProps = {
  teams: MyTeamWithApplications[];
};

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

          return (
            <Card key={team.teamId} className={`flex flex-col gap-4 ${isMultiple ? "w-72 shrink-0" : "w-full"}`}>
              {/* 팀명 + 역할 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{team.teamName}</span>
                <Badge variant={isCaptain ? "live" : "default"}>
                  {isCaptain ? "팀장" : "팀원"}
                </Badge>
              </div>

              {/* 통계 */}
              <div className="rounded-lg bg-slate-50 px-3 py-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>팀원</span>
                  <span className="ml-auto font-semibold text-slate-800">{team.memberCount}명</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>참가 대회</span>
                  <span className="ml-auto font-semibold text-slate-800">{team.totalTournamentCount}개</span>
                </div>
                {isCaptain && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className={team.pendingJoinCount > 0 ? "text-amber-600 font-medium" : "text-slate-500"}>
                      팀원 신청
                    </span>
                    <span className="ml-auto">
                      {team.pendingJoinCount > 0
                        ? <Badge variant="warning">{team.pendingJoinCount}건</Badge>
                        : <span className="text-slate-400">없음</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="mt-auto flex gap-2">
                <Link href={`/teams/${team.teamId}`} className="flex-1">
                  <Button variant="secondary" className="w-full">팀 상세 보기</Button>
                </Link>
                {isCaptain && (
                  <Link href={`/teams/${team.teamId}/applications`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      신청 관리
                      {team.pendingJoinCount > 0 && (
                        <Badge variant="warning" className="ml-1">{team.pendingJoinCount}</Badge>
                      )}
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </Wrapper>
    </section>
  );
}
