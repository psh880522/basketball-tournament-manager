"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RosterPicker from "@/components/team/RosterPicker";
import DivisionSummaryCard from "./_components/DivisionSummaryCard";
import RosterCounter from "./_components/RosterCounter";
import type { ManagedTeamRow } from "@/lib/api/teams";
import type { MyApplicationRow } from "@/lib/api/applications";
import type { DivisionRow } from "@/lib/api/divisions";
import type { TeamMemberForRoster } from "@/lib/api/rosters";
import { applyWithRosterAction } from "./actions";
import Link from "next/link";

/* ── 팀 없음 안내 ────────────────────────────── */

function NoTeamsGuide() {
  return (
    <Card className="space-y-3 text-center">
      <p className="text-sm text-gray-600">
        참가 신청하려면 먼저 팀을 만들어야 합니다.
      </p>
      <Link href="/dashboard">
        <Button>대시보드로 이동</Button>
      </Link>
    </Card>
  );
}

/* ── 신청 폼 ─────────────────────────────────── */

export default function ApplyTeamForm({
  tournamentId,
  tournamentStartDate,
  managedTeams,
  division,
  myActiveApps = [],
  teamMembersMap = {},
}: {
  tournamentId: string;
  tournamentStartDate: string | null;
  managedTeams: ManagedTeamRow[];
  division: DivisionRow;
  myActiveApps?: MyApplicationRow[];
  teamMembersMap?: Record<string, TeamMemberForRoster[] | null>;
}) {
  const router = useRouter();

  // 대회 시작 여부 (로스터 잠금 기준)
  const today = new Date().toISOString().split("T")[0];
  const isRosterLocked = tournamentStartDate !== null && tournamentStartDate <= today;

  const [selectedTeamId, setSelectedTeamId] = useState(
    managedTeams.length === 1 ? managedTeams[0].team_id : ""
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 팀이 바뀌면 선택된 선수 초기화 */
  function handleTeamChange(teamId: string) {
    setSelectedTeamId(teamId);
    setSelectedMemberIds([]);
  }

  if (managedTeams.length === 0) return <NoTeamsGuide />;

  const selectedTeamMembers = selectedTeamId
    ? (teamMembersMap[selectedTeamId] ?? [])
    : [];

  const canSubmit =
    !!selectedTeamId &&
    selectedMemberIds.length >= division.min_roster_size &&
    !loading;

  // 다른 팀으로 이미 신청한 경우 경고
  const duplicateWarning =
    selectedTeamId && myActiveApps.length > 0
      ? myActiveApps.find((a) => a.team_id !== selectedTeamId)
      : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTeamId) { setError("팀을 선택해주세요."); return; }

    setLoading(true);
    setError(null);

    const result = await applyWithRosterAction({
      tournamentId,
      teamId: selectedTeamId,
      divisionId: division.id,
      memberIds: selectedMemberIds,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.rosterWarning) {
      setError(result.rosterWarning);
      setLoading(false);
      return;
    }

    router.push(`/my-applications/${result.applicationId}?from=apply`);
  }

  return (
    <div className="space-y-4">
      {/* 선택된 디비전 요약 (읽기 전용) */}
      <DivisionSummaryCard
        division={division}
        backHref={`/tournament/${tournamentId}`}
      />

      <Card className="space-y-6">
        <h2 className="text-lg font-semibold">참가 신청</h2>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 팀 선택 */}
          <div className="space-y-1.5">
            <label htmlFor="team-select" className="block text-sm font-medium text-gray-700">
              팀 선택
            </label>
            <select
              id="team-select"
              value={selectedTeamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              disabled={loading}
            >
              <option value="">-- 팀을 선택하세요 --</option>
              {managedTeams.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  {t.team_name}
                </option>
              ))}
            </select>

            {/* 중복 신청 경고 배너 */}
            {duplicateWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium">다른 팀으로 이미 신청한 대회입니다.</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  {duplicateWarning.team_name} 팀으로 신청 중입니다.{" "}
                  <Link href="/my-applications" className="underline">신청 현황 확인</Link>
                </p>
              </div>
            )}
          </div>

          {/* 출전 선수 선택 */}
          {selectedTeamId && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">출전 선수 선택</p>
                <RosterCounter
                  count={selectedMemberIds.length}
                  min={division.min_roster_size}
                />
              </div>
              {isRosterLocked ? (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                  대회가 이미 시작되어 출전 선수를 선택할 수 없습니다.
                  <br />
                  신청 후 로스터는 수정되지 않습니다.
                </div>
              ) : (
                <RosterPicker
                  allMembers={selectedTeamMembers}
                  selectedIds={selectedMemberIds}
                  onAdd={(userId) =>
                    setSelectedMemberIds((prev) => [...prev, userId])
                  }
                  onRemove={(userId) =>
                    setSelectedMemberIds((prev) => prev.filter((id) => id !== userId))
                  }
                />
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={!canSubmit}>
            {loading ? "신청 중…" : "참가 신청"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
