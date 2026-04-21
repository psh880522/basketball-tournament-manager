"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RosterPicker from "@/components/team/RosterPicker";
import type { ManagedTeamRow } from "@/lib/api/teams";
import type { MyApplicationRow } from "@/lib/api/applications";
import type { DivisionRow } from "@/lib/api/divisions";
import type { TeamMemberForRoster } from "@/lib/api/rosters";
import { applyWithRosterAction } from "./actions";

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

/* ── Division 없음 안내 ──────────────────────── */

function NoDivisionsGuide() {
  return (
    <Card className="space-y-3 text-center">
      <p className="text-sm text-gray-600">
        이 대회는 아직 참가 구분(division)이 설정되지 않았습니다.
        <br />
        운영자에게 문의하세요.
      </p>
    </Card>
  );
}

/* ── 신청 폼 ─────────────────────────────────── */

export default function ApplyTeamForm({
  tournamentId,
  tournamentStartDate,
  managedTeams,
  divisions,
  myActiveApps = [],
  teamMembersMap = {},
}: {
  tournamentId: string;
  tournamentStartDate: string | null;
  managedTeams: ManagedTeamRow[];
  divisions: DivisionRow[];
  myActiveApps?: MyApplicationRow[];
  teamMembersMap?: Record<string, TeamMemberForRoster[] | null>;
}) {
  const router = useRouter();

  // 대회 시작 여부 (로스터 잠금 기준)
  const today = new Date().toISOString().split("T")[0];
  const isRosterLocked = tournamentStartDate !== null && tournamentStartDate <= today;

  const [selectedDivisionId, setSelectedDivisionId] = useState(
    divisions.length === 1 ? divisions[0].id : ""
  );
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
  if (divisions.length === 0) return <NoDivisionsGuide />;

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const selectedTeamMembers = selectedTeamId
    ? (teamMembersMap[selectedTeamId] ?? [])
    : [];

  const canSubmit = !!selectedTeamId && !!selectedDivisionId && !loading;

  // 다른 팀으로 이미 신청한 경우 경고
  const duplicateWarning =
    selectedTeamId && myActiveApps.length > 0
      ? myActiveApps.find((a) => a.team_id !== selectedTeamId)
      : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTeamId) { setError("팀을 선택해주세요."); return; }
    if (!selectedDivisionId) { setError("참가 구분(division)을 선택해주세요."); return; }

    setLoading(true);
    setError(null);

    const result = await applyWithRosterAction({
      tournamentId,
      teamId: selectedTeamId,
      divisionId: selectedDivisionId,
      memberIds: selectedMemberIds,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 일부 선수 추가 실패 시 warning은 신청 현황 페이지에서 확인
    router.push(`/my-applications/${result.applicationId}`);
  }

  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold">참가 신청</h2>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Step 1: 참가 구분 */}
        <div className="space-y-1.5">
          <label htmlFor="division-select" className="block text-sm font-medium text-gray-700">
            참가 구분 (Division)
          </label>
          <select
            id="division-select"
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            disabled={loading}
          >
            <option value="">-- 참가 구분을 선택하세요 --</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.entry_fee > 0 ? ` (${d.entry_fee.toLocaleString()}원)` : ""}
              </option>
            ))}
          </select>
          {selectedDivision && (
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600 space-y-0.5">
              <p>
                <span className="font-medium text-gray-800">참가비:</span>{" "}
                {selectedDivision.entry_fee > 0
                  ? `${selectedDivision.entry_fee.toLocaleString()}원`
                  : "무료"}
              </p>
              <p>
                <span className="font-medium text-gray-800">정원:</span>{" "}
                {selectedDivision.capacity != null ? `${selectedDivision.capacity}팀` : "무제한"}
              </p>
            </div>
          )}
        </div>

        {/* Step 2: 팀 선택 */}
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
                {duplicateWarning.team_name} 팀으로 신청 중입니다. 로스터 구성 시 중복 출전이 제한됩니다.{" "}
                <Link href="/my-applications" className="underline">신청 현황 확인</Link>
              </p>
            </div>
          )}
        </div>

        {/* Step 3: 출전 선수 선택 */}
        {selectedTeamId && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">출전 선수 선택</p>
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
  );
}
