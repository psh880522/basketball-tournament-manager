import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { TournamentListItem, TournamentStatus } from "@/lib/api/tournaments";
import type { MyApplicationListRow, ApplicationStatus } from "@/lib/api/applications";
import type { Role } from "@/src/lib/auth/roles";

type DivisionSummary = TournamentListItem["divisions"][number];

type CtaConfig = {
  secondary: { label: string; href: string };
  primary?: { label: string; href: string };
  ghost?: { label: string; href: string };
};

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "날짜 미정";
  const s = new Date(start).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  return `${s} ~ ${e}`;
}

function calcEntryFeeRange(divisions: DivisionSummary[]): string {
  if (divisions.length === 0) return "";
  const fees = divisions.map((d) => d.entry_fee);
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  if (min === 0 && max === 0) return "무료";
  if (min === max) return `${min.toLocaleString()}원`;
  return `${min.toLocaleString()} ~ ${max.toLocaleString()}원`;
}

function calcTotalCapacity(divisions: DivisionSummary[]): number | null {
  if (divisions.length === 0) return null;
  if (divisions.some((d) => d.capacity === null)) return null;
  return divisions.reduce((sum, d) => sum + (d.capacity ?? 0), 0);
}

type StatusConfig = { label: string; variant: "live" | "info" | "default" };

function getTournamentStatusConfig(status: TournamentStatus): StatusConfig {
  switch (status) {
    case "open":
      return { label: "모집중", variant: "live" };
    case "closed":
      return { label: "진행중", variant: "info" };
    case "finished":
      return { label: "종료", variant: "default" };
    default:
      return { label: status, variant: "default" };
  }
}

type AppStatusConfig = { label: string; variant: "success" | "warning" | "info" | "default" };

function getAppStatusConfig(status: ApplicationStatus): AppStatusConfig {
  switch (status) {
    case "confirmed":
      return { label: "참가 확정", variant: "success" };
    case "waitlisted":
      return { label: "대기중", variant: "warning" };
    case "paid_pending_approval":
      return { label: "입금 확인중", variant: "info" };
    case "payment_pending":
      return { label: "입금 대기", variant: "warning" };
    case "cancelled":
      return { label: "신청 취소", variant: "default" };
    case "expired":
      return { label: "기간 만료", variant: "default" };
    default:
      return { label: status, variant: "default" };
  }
}

function getCtaConfig(
  tournament: TournamentListItem,
  myApp: MyApplicationListRow | null,
  role: Role | null
): CtaConfig {
  const id = tournament.id;

  if (role !== "player") {
    return { secondary: { label: "상세보기", href: `/tournament/${id}` } };
  }

  if (tournament.status !== "open") {
    return { secondary: { label: "상세보기", href: `/tournament/${id}` } };
  }

  if (!myApp) {
    return {
      secondary: { label: "상세보기", href: `/tournament/${id}` },
      primary: { label: "참가 신청", href: `/tournament/${id}/apply` },
    };
  }

  switch (myApp.status) {
    case "payment_pending":
      return {
        secondary: { label: "상세보기", href: `/tournament/${id}` },
        ghost: { label: "입금 안내", href: `/my-applications/${myApp.id}` },
      };
    case "paid_pending_approval":
    case "waitlisted":
      return {
        secondary: { label: "신청 현황", href: `/my-applications/${myApp.id}` },
      };
    case "confirmed":
      return { secondary: { label: "상세보기", href: `/tournament/${id}` } };
    case "cancelled":
    case "expired":
      return {
        secondary: { label: "상세보기", href: `/tournament/${id}` },
        primary: { label: "다시 신청", href: `/tournament/${id}/apply` },
      };
    default:
      return { secondary: { label: "상세보기", href: `/tournament/${id}` } };
  }
}

type Props = {
  tournament: TournamentListItem;
  myApplication: MyApplicationListRow | null;
  role: Role | null;
};

export default function TournamentCard({ tournament, myApplication, role }: Props) {
  const statusConfig = getTournamentStatusConfig(tournament.status);
  const feeRange = calcEntryFeeRange(tournament.divisions);
  const totalCapacity = calcTotalCapacity(tournament.divisions);
  const cta = getCtaConfig(tournament, myApplication, role);

  return (
    <Card className="space-y-3">
      {/* 상태 뱃지 + 제목 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          {myApplication && (
            <Badge variant={getAppStatusConfig(myApplication.status).variant}>
              {getAppStatusConfig(myApplication.status).label}
            </Badge>
          )}
        </div>
        <p className="font-semibold text-slate-900">{tournament.name}</p>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar size={13} className="shrink-0" />
          {formatDateRange(tournament.start_date, tournament.end_date)}
        </p>
        {tournament.location && (
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={13} className="shrink-0" />
            {tournament.location}
          </p>
        )}
      </div>

      {/* 부문 칩 */}
      {tournament.divisions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {tournament.divisions.map((d) => (
            <span
              key={d.id}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
            >
              {d.name}
            </span>
          ))}
        </div>
      )}

      {/* 참가비 + 정원 */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {feeRange && <span>참가비 {feeRange}</span>}
        {totalCapacity !== null && <span>정원 {totalCapacity}팀</span>}
      </div>

      {/* CTA 버튼 */}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Link href={cta.secondary.href}>
          <Button variant="secondary" className="text-xs px-3 py-1.5">
            {cta.secondary.label}
          </Button>
        </Link>
        {cta.ghost && (
          <Link href={cta.ghost.href}>
            <Button variant="ghost" className="text-xs px-3 py-1.5">
              {cta.ghost.label}
            </Button>
          </Link>
        )}
        {cta.primary && (
          <Link href={cta.primary.href}>
            <Button variant="primary" className="text-xs px-3 py-1.5">
              {cta.primary.label}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
