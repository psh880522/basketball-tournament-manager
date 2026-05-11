import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { MyTeamRow } from "@/lib/api/teams";

type EmptyDashboardProps =
  | { state: "no_team"; pendingJoin?: boolean }
  | { state: "no_app"; teams: MyTeamRow[] };

export default function EmptyDashboard(props: EmptyDashboardProps) {
  if (props.state === "no_team") {
    return (
      <div className="flex flex-col gap-4">
        {props.pendingJoin ? (
          <Card className="border border-amber-200 bg-amber-50">
            <p className="text-sm font-medium text-amber-900">팀 합류 신청 중</p>
            <p className="mt-1 text-xs text-amber-700">
              팀 캡틴의 승인을 기다리고 있습니다. 승인되면 대시보드가 업데이트됩니다.
            </p>
          </Card>
        ) : (
          <Card variant="highlight" className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="text-5xl">🏀</div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-800">
                아직 속한 팀이 없어요
              </p>
              <p className="text-sm text-slate-500">
                팀을 만들거나, 기존 팀에 합류 신청을 해보세요.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/teams/new">
                <Button variant="primary">팀 만들기</Button>
              </Link>
              <Link href="/teams/find">
                <Button variant="secondary">팀 찾기</Button>
              </Link>
            </div>
          </Card>
        )}

        <Card className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800">대회 둘러보기</p>
            <p className="mt-0.5 text-xs text-slate-500">현재 모집 중인 대회를 확인하세요.</p>
          </div>
          <Link href="/tournaments">
            <Button variant="ghost">둘러보기 →</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // state === "no_app"
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "소속 팀", value: props.teams.length },
          { label: "내가 만든 팀", value: props.teams.filter((t) => t.role_in_team === "captain").length },
          { label: "진행 중 대회", value: 0 },
          { label: "이번 주 경기", value: 0 },
          { label: "확인 필요", value: 0 },
        ].map((item, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 shadow-sm ${i === 4 ? "col-span-2 sm:col-span-1" : ""} bg-white`}
          >
            <p className="text-2xl font-bold text-slate-800">{item.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">내 팀들</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {props.teams.map((team) => (
            <Card key={team.team_id} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{team.team_name}</span>
                <Badge variant={team.role_in_team === "captain" ? "live" : "default"}>
                  {team.role_in_team === "captain" ? "팀장" : "팀원"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">참가 중인 대회 없음</p>
              <Link href={`/teams/${team.team_id}`} className="self-start">
                <Button variant="secondary">팀 보러가기</Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <Card className="flex items-center justify-between gap-4 bg-[#FFF5EC]">
        <div>
          <p className="text-sm font-medium text-slate-800">🏆 대회에 참가해보세요</p>
          <p className="mt-0.5 text-xs text-slate-500">현재 신청 가능한 대회를 확인하세요.</p>
        </div>
        <Link href="/tournaments">
          <Button variant="primary">대회 찾기</Button>
        </Link>
      </Card>
    </div>
  );
}
