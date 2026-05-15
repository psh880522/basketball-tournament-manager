"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { CalendarDays, Check, Copy, ExternalLink, MapPin } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getTournamentStatusDisplay } from "@/lib/utils/tournament";
import type { PublicTournamentRow } from "@/lib/api/tournaments";
import type { DivisionRow } from "@/lib/api/divisions";
import type { MyApplicationRow, PlayerParticipation } from "@/lib/api/applications";


const APPLICATION_STATUS_MAP: Record<
  string,
  { variant: "default" | "success" | "warning" | "danger" | "info"; label: string }
> = {
  payment_pending:       { variant: "warning", label: "입금 대기" },
  paid_pending_approval: { variant: "info",    label: "승인 대기" },
  confirmed:             { variant: "success", label: "참가 확정" },
  waitlisted:            { variant: "warning", label: "대기 중" },
  expired:               { variant: "default", label: "만료됨" },
  cancelled:             { variant: "danger",  label: "취소됨" },
};

type Props = {
  tournament: PublicTournamentRow;
  divisions: DivisionRow[];
  counts: Record<string, number> | null; // null = 비로그인 (표시 안 함)
  myApplication: MyApplicationRow | null;
  isLoggedIn: boolean;
  isOrganizer: boolean;
  playerParticipation: PlayerParticipation;
};

export default function TournamentStickyPanel({
  tournament,
  divisions,
  counts,
  myApplication,
  isLoggedIn,
  isOrganizer,
  playerParticipation,
}: Props) {
  const [selectedId, setSelectedId] = useState(
    divisions.length === 1 ? divisions[0].id : ""
  );
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  const statusConfig = getTournamentStatusDisplay(tournament.status, tournament.start_date ?? null);

  const isResultVisible = tournament.status === "closed" || tournament.status === "finished";
  const canReapply =
    tournament.status === "open" &&
    (myApplication?.status === "cancelled" || myApplication?.status === "expired");

  // 캡틴·팀원 참가 정보 통합
  const participantInfo = myApplication
    ? {
        status: myApplication.status,
        teamName: myApplication.team_name,
        divisionName: myApplication.division_name,
        divisionId: myApplication.division_id,
        applicationId: myApplication.id,
      }
    : playerParticipation.participating
    ? {
        status: playerParticipation.status,
        teamName: playerParticipation.teamName,
        divisionName: playerParticipation.divisionName,
        divisionId: playerParticipation.divisionId,
        applicationId: playerParticipation.applicationId,
      }
    : null;

  const appStatusConfig = participantInfo
    ? (APPLICATION_STATUS_MAP[participantInfo.status] ?? null)
    : null;

  const applyHref = isLoggedIn
    ? `/tournament/${tournament.id}/apply?division=${selectedId}`
    : "/login";

  return (
    <div
      className="sticky flex flex-col gap-3"
      style={{ top: "calc(var(--header-height, 0px) + 0.5rem)" }}
    >
      <Card>
        {/* 대회 기본정보 */}
        <div className="mb-4 space-y-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <h1 className="text-base font-bold leading-snug text-slate-900">
            {tournament.name}
          </h1>
          <dl className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="shrink-0 text-slate-400" />
              <dd>{tournament.start_date ?? "TBD"} – {tournament.end_date ?? "TBD"}</dd>
            </div>
            {(() => {
              const loc = tournament.location;
              const addrMatch = loc?.match(/\(([^)]+)\)$/);
              const searchQuery = addrMatch ? addrMatch[1] : (loc ?? "");
              return (
                <div className="flex items-start gap-1.5">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  <div className="space-y-1">
                    <dd>{loc ?? "미정"}</dd>
                    {loc && (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] text-[#03C75A] hover:underline"
                        >
                          네이버지도 <ExternalLink size={10} />
                        </a>
                        {tournament.location_lat !== null && tournament.location_lng !== null && (
                          <a
                            href={`https://map.kakao.com/link/map/${encodeURIComponent(searchQuery)},${tournament.location_lat},${tournament.location_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-[#FAE100] [text-shadow:0_0_1px_#555] hover:underline"
                          >
                            카카오맵 <ExternalLink size={10} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyAddress(searchQuery)}
                          className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                          {copied ? "복사됨" : "주소 복사"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </dl>
        </div>

        <div className="h-px bg-slate-100" />

        {/* 참가 부문 */}
        <div className="my-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            참가 부문
          </p>
          {divisions.length === 0 ? (
            <p className="text-sm text-slate-400">부문 정보가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {divisions.map((division) => {
                const isMine = participantInfo?.divisionId === division.id;
                // counts가 null이면 카운트 데이터 없음 (비로그인)
                const count = counts !== null ? (counts[division.id] ?? 0) : null;
                const isFull = division.capacity !== null && count !== null && count >= division.capacity;
                const isSelected = selectedId === division.id;
                const isDisabled = isFull && !isMine;

                return (
                  <button
                    key={division.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled && !participantInfo) setSelectedId(division.id);
                    }}
                    className={[
                      "w-full rounded-xl border p-3 text-left transition",
                      isMine
                        ? "border-amber-300 bg-amber-50"
                        : isDisabled
                        ? "cursor-default border-slate-200 bg-slate-50 opacity-60"
                        : isSelected
                        ? "border-[#FF6B00] bg-[#FFF5EC] ring-1 ring-[#FF6B00]/30"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {division.name}
                      </span>
                      {isMine && (
                        <Badge variant="warning" className="shrink-0 text-xs">내 신청</Badge>
                      )}
                      {isFull && !isMine && (
                        <Badge variant="default" className="shrink-0 text-xs">마감</Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex gap-3 text-xs text-slate-500">
                      <span>
                        {division.entry_fee === 0
                          ? "무료"
                          : `${division.entry_fee.toLocaleString()}원`}
                      </span>
                      {division.capacity !== null && (
                        <span>
                          {count !== null
                            ? `${count}/${division.capacity}팀`
                            : `정원 ${division.capacity}팀`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 내 신청 현황 요약 */}
        {participantInfo && appStatusConfig && (
          <>
            <div className="h-px bg-slate-100" />
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">내 신청</span>
                <Badge variant={appStatusConfig.variant}>{appStatusConfig.label}</Badge>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-900">{participantInfo.teamName}</p>
              <p className="text-xs text-slate-500">{participantInfo.divisionName}</p>
            </div>
          </>
        )}

        <div className="h-px bg-slate-100 mt-4" />

        {/* CTA 버튼 */}
        <div className="mt-4 flex flex-col gap-2">

          {/* 신청 가능 상태 */}
          {tournament.status === "open" && !participantInfo && (
            <Link href={selectedId ? applyHref : "#"} className="w-full" aria-disabled={!selectedId}>
              <Button variant="primary" className="w-full" disabled={!selectedId}>
                팀 참가 신청 →
              </Button>
            </Link>
          )}

          {/* 재신청 */}
          {canReapply && (
            <Link href={selectedId ? applyHref : "#"} className="w-full" aria-disabled={!selectedId}>
              <Button variant="primary" className="w-full" disabled={!selectedId}>
                다시 신청하기
              </Button>
            </Link>
          )}

          {/* 신청 현황 보기 (입금대기·승인대기·대기자) */}
          {participantInfo &&
            (participantInfo.status === "payment_pending" ||
              participantInfo.status === "paid_pending_approval" ||
              participantInfo.status === "waitlisted") && (
            <Link href={`/my-applications/${participantInfo.applicationId}`} className="w-full">
              <Button variant="secondary" className="w-full">신청 현황 보기</Button>
            </Link>
          )}

          {/* 확정 — 결과 또는 신청 현황 */}
          {participantInfo?.status === "confirmed" && (
            <Link
              href={isResultVisible
                ? `/tournament/${tournament.id}/result`
                : `/my-applications/${participantInfo.applicationId}`}
              className="w-full"
            >
              <Button variant="secondary" className="w-full">
                {isResultVisible ? "결과 보기" : "신청 현황 보기"}
              </Button>
            </Link>
          )}

          {/* 주최자 관리 */}
          {tournament.status === "draft" && isOrganizer && (
            <Link href={`/admin/tournaments/${tournament.id}`} className="w-full">
              <Button variant="secondary" className="w-full">관리하기</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
