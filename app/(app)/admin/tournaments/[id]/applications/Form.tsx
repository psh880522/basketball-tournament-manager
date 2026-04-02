"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { setApplicationStatusAction, createDummyTeamAction } from "./actions";
import type { TournamentApplicationRow, ApplicationStatus } from "@/lib/api/applications";

const statusLabel: Record<ApplicationStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

const statusBadgeClass: Record<ApplicationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DivisionOption = { id: string; name: string };

export default function ApplicationList({
  applications: initialApplications,
  tournamentId,
  divisions,
}: {
  applications: TournamentApplicationRow[];
  tournamentId: string;
  divisions: DivisionOption[];
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [filterDivisionId, setFilterDivisionId] = useState("");
  const [dummyName, setDummyName] = useState("");
  const [isCreating, startCreateTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!filterDivisionId) return applications;
    return applications.filter((a) => a.division_id === filterDivisionId);
  }, [applications, filterDivisionId]);

  useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  return (
    <div className="space-y-4">
      {/* Division 필터 */}
      {divisions.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label
            htmlFor="division-filter"
            className="text-sm font-medium text-gray-700"
          >
            참가 구분
          </label>
          <select
            id="division-filter"
            value={filterDivisionId}
            onChange={(e) => {
              setFilterDivisionId(e.target.value);
              setCreateError(null);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="">전체</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600">
              더미팀 이름(선택)
            </label>
            <input
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              value={dummyName}
              onChange={(e) => setDummyName(e.target.value)}
              placeholder="예: DUMMY-TEST"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (!filterDivisionId) {
                setCreateError("더미팀을 추가할 참가 구분을 선택하세요.");
                return;
              }
              setCreateError(null);
              startCreateTransition(async () => {
                const result = await createDummyTeamAction(
                  tournamentId,
                  filterDivisionId,
                  dummyName.trim() || undefined
                );
                if (!result.ok) {
                  setCreateError(result.error);
                  return;
                }
                setDummyName("");
                router.refresh();
              });
            }}
            disabled={!filterDivisionId || isCreating}
          >
            {isCreating ? "추가 중..." : "+ 더미팀 추가"}
          </Button>
        </div>
      )}

      {createError && (
        <p className="text-sm text-red-600">{createError}</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {filtered.length === 0 ? (
        <Card className="text-sm text-gray-500">
          {filterDivisionId
            ? "해당 참가 구분의 신청이 없습니다."
            : "참가 신청이 없습니다."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationItem
              key={app.id}
              application={app}
              tournamentId={tournamentId}
              onStatusChanged={(id, newStatus) => {
                setApplications((prev) =>
                  prev.map((a) =>
                    a.id === id ? { ...a, status: newStatus } : a
                  )
                );
                setError(null);
              }}
              onError={(msg) => setError(msg)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationItem({
  application,
  tournamentId,
  onStatusChanged,
  onError,
}: {
  application: TournamentApplicationRow;
  tournamentId: string;
  onStatusChanged: (id: string, status: ApplicationStatus) => void;
  onError: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (status: "approved" | "rejected") => {
    startTransition(async () => {
      const result = await setApplicationStatusAction(
        application.id,
        status,
        tournamentId
      );
      if (result.ok) {
        onStatusChanged(application.id, status);
      } else {
        onError(result.error);
      }
    });
  };

  return (
    <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {application.division_name && (
            <Badge className="bg-blue-100 text-blue-700">
              {application.division_name}
            </Badge>
          )}
          {application.team_is_dummy && (
            <Badge className="bg-gray-200 text-gray-700">DUMMY</Badge>
          )}
          <p className="text-sm font-semibold">{application.team_name}</p>
        </div>
        <p className="text-xs text-gray-500">
          신청일: {formatDate(application.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={statusBadgeClass[application.status]}>
          {statusLabel[application.status]}
        </Badge>
        {application.status === "pending" ? (
          <>
            <Button
              variant="primary"
              onClick={() => handleAction("approved")}
              disabled={isPending}
            >
              {isPending ? "처리중..." : "승인"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAction("rejected")}
              disabled={isPending}
            >
              {isPending ? "처리중..." : "거절"}
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  );
}
