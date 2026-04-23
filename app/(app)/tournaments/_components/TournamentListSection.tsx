import Link from "next/link";
import { getTournamentList } from "@/lib/api/tournaments";
import { listAllMyTeamApplications } from "@/lib/api/applications";
import type { TournamentListItem, TournamentStatus } from "@/lib/api/tournaments";
import type { MyApplicationListRow, ApplicationStatus } from "@/lib/api/applications";
import type { Role } from "@/src/lib/auth/roles";
import TournamentCard from "./TournamentCard";

const STATUS_PRIORITY: Record<ApplicationStatus, number> = {
  confirmed: 0,
  waitlisted: 1,
  paid_pending_approval: 2,
  payment_pending: 3,
  cancelled: 4,
  expired: 5,
};

function buildApplicationMap(apps: MyApplicationListRow[]): Map<string, MyApplicationListRow> {
  const map = new Map<string, MyApplicationListRow>();
  for (const app of apps) {
    const existing = map.get(app.tournament_id);
    if (!existing || STATUS_PRIORITY[app.status] < STATUS_PRIORITY[existing.status]) {
      map.set(app.tournament_id, app);
    }
  }
  return map;
}

function getActiveApplicationTournamentIds(apps: MyApplicationListRow[]): string[] {
  const activeStatuses: ApplicationStatus[] = [
    "payment_pending",
    "paid_pending_approval",
    "confirmed",
    "waitlisted",
  ];
  const ids = apps
    .filter((a) => activeStatuses.includes(a.status))
    .map((a) => a.tournament_id);
  return [...new Set(ids)];
}

function tabToStatus(tab: string): TournamentStatus | TournamentStatus[] | undefined {
  switch (tab) {
    case "open":
      return "open";
    case "closed":
      return "closed";
    case "finished":
      return "finished";
    default:
      return undefined;
  }
}

function EmptyMessage({ tab }: { tab: string }) {
  if (tab === "mine") {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
        참가 신청한 대회가 없습니다.{" "}
        <Link href="/tournaments?tab=open" className="text-[#FF6B00] hover:underline">
          모집중인 대회
        </Link>
        를 확인해보세요.
      </p>
    );
  }
  const messages: Record<string, string> = {
    all: "현재 진행 중인 대회가 없습니다.",
    open: "현재 모집 중인 대회가 없습니다.",
    closed: "현재 진행 중인 대회가 없습니다.",
    finished: "종료된 대회가 없습니다.",
  };
  return (
    <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
      {messages[tab] ?? "대회가 없습니다."}
    </p>
  );
}

type Props = {
  tab: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  role: Role | null;
};

export default async function TournamentListSection({ tab, q, dateFrom, dateTo, role }: Props) {
  const appsResult = role ? await listAllMyTeamApplications() : null;
  const allApps = appsResult?.data ?? [];
  const myApplicationMap = buildApplicationMap(allApps);

  let tournaments: TournamentListItem[] = [];
  let fetchError: string | null = null;

  if (tab === "mine") {
    const myTournamentIds = getActiveApplicationTournamentIds(allApps);
    if (myTournamentIds.length > 0) {
      const result = await getTournamentList({ ids: myTournamentIds });
      tournaments = result.data ?? [];
      fetchError = result.error;
    }
  } else {
    const statusFilter = tabToStatus(tab);
    const result = await getTournamentList({
      status: statusFilter,
      keyword: q,
      dateFrom,
      dateTo,
    });
    tournaments = result.data ?? [];
    fetchError = result.error;
  }

  if (fetchError) {
    return (
      <p className="text-sm text-red-600">대회 목록을 불러오지 못했습니다.</p>
    );
  }

  if (tournaments.length === 0) {
    return <EmptyMessage tab={tab} />;
  }

  return (
    <div className="space-y-3">
      {tournaments.map((t) => (
        <TournamentCard
          key={t.id}
          tournament={t}
          myApplication={myApplicationMap.get(t.id) ?? null}
          role={role}
        />
      ))}
    </div>
  );
}
