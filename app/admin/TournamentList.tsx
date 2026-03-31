"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  type AdminTournamentListRow,
  type TournamentStatus,
} from "@/lib/api/tournaments";
import { type Role } from "@/src/lib/auth/roles";
import {
  changeTournamentStatusAction,
  restoreTournamentAction,
  softDeleteTournamentAction,
} from "./actions";

type TournamentListProps = {
  includeDeleted: boolean;
  tournaments: AdminTournamentListRow[];
  error: string | null;
  role: Role;
};

const statusLabels: Record<TournamentStatus, string> = {
  open: "모집중",
  closed: "진행중",
  draft: "준비중",
  finished: "완료",
};

const statusBadgeClasses: Record<TournamentStatus, string> = {
  open: "bg-emerald-100 text-emerald-700",
  closed: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-700",
  finished: "bg-amber-100 text-amber-700",
};

const statusOptions: TournamentStatus[] = [
  "draft",
  "open",
  "closed",
  "finished",
];

function formatDate(value: string | null) {
  if (!value) return "일정 미정";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "일정 미정";
  return parsed.toLocaleDateString("ko-KR");
}

function formatRange(tournament: AdminTournamentListRow) {
  const start = formatDate(tournament.start_date);
  const end = formatDate(tournament.end_date);

  if (start === "일정 미정" && end === "일정 미정") {
    return "일정 미정";
  }

  if (start === end) return start;

  return `${start} - ${end}`;
}

export default function TournamentList({
  includeDeleted,
  tournaments,
  error,
  role,
}: TournamentListProps) {
  const isOrganizer = role === "organizer";
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<
    "delete" | "restore" | "status" | null
  >(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});
  const [statusSelections, setStatusSelections] = useState<
    Record<string, TournamentStatus>
  >(() =>
    Object.fromEntries(tournaments.map((tournament) => [tournament.id, tournament.status]))
  );
  const [, startTransition] = useTransition();
  const toggleHref = includeDeleted ? "/admin" : "/admin?includeDeleted=1";
  const toggleLabel = includeDeleted ? "삭제된 대회 숨기기" : "삭제된 대회 보기";

  useEffect(() => {
    setStatusSelections(
      Object.fromEntries(
        tournaments.map((tournament) => [tournament.id, tournament.status])
      )
    );
  }, [tournaments]);

  const getConfirmMessage = (
    currentStatus: TournamentStatus,
    nextStatus: TournamentStatus
  ) => {
    if (nextStatus === "finished") {
      return "대회를 종료하면 운영 기능이 잠기며 되돌릴 수 없습니다. 계속할까요?";
    }

    if (currentStatus === "closed" && nextStatus === "open") {
      return "모집을 다시 오픈합니다. 계속할까요?";
    }

    if (currentStatus === "open" && nextStatus === "draft") {
      return "모집을 취소하고 준비중으로 돌립니다. 계속할까요?";
    }

    if (currentStatus === "closed" && nextStatus === "draft") {
      return "상태를 준비중으로 롤백합니다. 계속할까요?";
    }

    return null;
  };

  const handleDelete = (tournamentId: string) => {
    const shouldDelete = window.confirm("정말 이 대회를 숨김 처리할까요?");

    if (!shouldDelete) return;

    setRowErrors((prev) => ({ ...prev, [tournamentId]: null }));
    setPendingId(tournamentId);
    setPendingMode("delete");

    startTransition(() => {
      softDeleteTournamentAction(tournamentId)
        .then((result) => {
          if (!result.ok) {
            setRowErrors((prev) => ({
              ...prev,
              [tournamentId]: result.error,
            }));
            return;
          }
          router.refresh();
        })
        .finally(() => {
          setPendingId(null);
          setPendingMode(null);
        });
    });
  };

  const handleRestore = (tournamentId: string) => {
    setRowErrors((prev) => ({ ...prev, [tournamentId]: null }));
    setPendingId(tournamentId);
    setPendingMode("restore");

    startTransition(() => {
      restoreTournamentAction(tournamentId)
        .then((result) => {
          if (!result.ok) {
            setRowErrors((prev) => ({
              ...prev,
              [tournamentId]: result.error,
            }));
            return;
          }
          router.refresh();
        })
        .finally(() => {
          setPendingId(null);
          setPendingMode(null);
        });
    });
  };

  const handleApplyStatus = (tournament: AdminTournamentListRow) => {
    const nextStatus = statusSelections[tournament.id] ?? tournament.status;

    if (nextStatus === tournament.status) return;

    const confirmMessage = getConfirmMessage(tournament.status, nextStatus);

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setRowErrors((prev) => ({ ...prev, [tournament.id]: null }));
    setPendingId(tournament.id);
    setPendingMode("status");

    startTransition(() => {
      changeTournamentStatusAction(tournament.id, nextStatus)
        .then((result) => {
          if (!result.ok) {
            setRowErrors((prev) => ({
              ...prev,
              [tournament.id]: result.error,
            }));
            return;
          }
          router.refresh();
        })
        .finally(() => {
          setPendingId(null);
          setPendingMode(null);
        });
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">총 {tournaments.length}개</div>
        <Link href={toggleHref}>
          <Button variant="secondary">{toggleLabel}</Button>
        </Link>
      </div>

      {error ? (
        <Card className="text-sm text-red-600">
          대회 목록을 불러오지 못했습니다: {error}
        </Card>
      ) : null}

      {!error && tournaments.length === 0 ? (
        <Card className="text-sm text-gray-600">
          등록된 대회가 없습니다. 새 대회를 생성해 주세요.
        </Card>
      ) : null}

      {!error && tournaments.length > 0 ? (
        <div className="space-y-4">
          {tournaments.map((tournament) => {
            const isDeleting =
              pendingId === tournament.id && pendingMode === "delete";
            const isRestoring =
              pendingId === tournament.id && pendingMode === "restore";
            const isUpdatingStatus =
              pendingId === tournament.id && pendingMode === "status";
            const isFinished = tournament.status === "finished";
            const selectedStatus =
              statusSelections[tournament.id] ?? tournament.status;

            return (
            <Card key={tournament.id} className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{tournament.name}</h3>
                    <Badge className={statusBadgeClasses[tournament.status]}>
                      {statusLabels[tournament.status]}
                    </Badge>
                    {tournament.deleted_at ? (
                      <Badge className="bg-rose-100 text-rose-700">삭제됨</Badge>
                    ) : null}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatRange(tournament)}
                    {tournament.location ? ` • ${tournament.location}` : ""}
                  </div>
                  {isFinished ? (
                    <p className="text-xs text-gray-500">
                      종료된 대회는 변경할 수 없습니다.
                    </p>
                  ) : null}
                  {rowErrors[tournament.id] ? (
                    <p className="text-sm text-red-600">
                      {rowErrors[tournament.id]}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={isOrganizer
                    ? `/admin/tournaments/${tournament.id}`
                    : `/admin/tournaments/${tournament.id}/result`
                  }>
                    <Button variant="secondary">운영</Button>
                  </Link>
                  {isOrganizer && (
                  <Link href={`/admin/tournaments/${tournament.id}/edit`}>
                    <Button variant="ghost">수정</Button>
                  </Link>
                  )}
                  {isOrganizer && !isFinished ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                        value={selectedStatus}
                        onChange={(event) =>
                          setStatusSelections((prev) => ({
                            ...prev,
                            [tournament.id]: event.target.value as TournamentStatus,
                          }))
                        }
                        disabled={isUpdatingStatus}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        disabled={isUpdatingStatus || selectedStatus === tournament.status}
                        onClick={() => handleApplyStatus(tournament)}
                      >
                        {isUpdatingStatus ? "적용 중..." : "적용"}
                      </Button>
                    </div>
                  ) : null}
                  {isOrganizer && (tournament.deleted_at ? (
                    <Button
                      variant="ghost"
                      disabled={isRestoring}
                      onClick={() => handleRestore(tournament.id)}
                    >
                      {isRestoring ? "복구 중..." : "복구"}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      disabled={isDeleting}
                      onClick={() => handleDelete(tournament.id)}
                    >
                      {isDeleting ? "삭제 중..." : "삭제"}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      ) : null}
    </section>
  );
}
