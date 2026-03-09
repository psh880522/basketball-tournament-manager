"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { ManagedTeamRow } from "@/lib/api/teams";
import type { MyApplicationRow } from "@/lib/api/applications";
import type { DivisionRow } from "@/lib/api/divisions";
import { applyTeamToTournament } from "./actions";

/* ── 신청 상태 표시 ──────────────────────────── */

const statusLabels: Record<string, { text: string; className: string }> = {
  pending: { text: "승인 대기 중", className: "bg-yellow-100 text-yellow-800" },
  approved: { text: "참가 확정", className: "bg-green-100 text-green-700" },
  rejected: { text: "참가 거절", className: "bg-red-100 text-red-700" },
};

function ApplicationStatus({ app }: { app: MyApplicationRow }) {
  const label = statusLabels[app.status] ?? statusLabels.pending;
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">참가 신청 현황</h2>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">팀</span>
          <span className="font-medium">{app.team_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">부문</span>
          <span className="font-medium">{app.division_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">상태</span>
          <Badge className={label.className}>{label.text}</Badge>
        </div>
      </div>
      <Link href={`/teams/${app.team_id}`}>
        <Button variant="secondary">내 팀 보기</Button>
      </Link>
    </Card>
  );
}

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
  managedTeams,
  divisions,
  existingApp,
}: {
  tournamentId: string;
  managedTeams: ManagedTeamRow[];
  divisions: DivisionRow[];
  existingApp: MyApplicationRow | null;
}) {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState(
    managedTeams.length === 1 ? managedTeams[0].team_id : ""
  );
  const [selectedDivisionId, setSelectedDivisionId] = useState(
    divisions.length === 1 ? divisions[0].id : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* 이미 신청한 경우 */
  if (existingApp) {
    return <ApplicationStatus app={existingApp} />;
  }

  /* 팀이 없는 경우 */
  if (managedTeams.length === 0) {
    return <NoTeamsGuide />;
  }

  /* Division 없는 경우 */
  if (divisions.length === 0) {
    return <NoDivisionsGuide />;
  }

  /* 신청 성공 후 */
  if (success) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-green-700 font-medium">
          참가 신청이 완료되었습니다!
        </p>
        <Button variant="secondary" onClick={() => router.refresh()}>
          신청 현황 보기
        </Button>
      </Card>
    );
  }

  const canSubmit = !!selectedTeamId && !!selectedDivisionId && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId) {
      setError("팀을 선택해주세요.");
      return;
    }
    if (!selectedDivisionId) {
      setError("참가 구분(division)을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await applyTeamToTournament({
      tournamentId,
      teamId: selectedTeamId,
      divisionId: selectedDivisionId,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">참가 신청</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: 팀 선택 */}
        <div>
          <label
            htmlFor="team-select"
            className="block text-sm font-medium text-gray-700"
          >
            팀 선택
          </label>
          <select
            id="team-select"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            disabled={loading}
          >
            <option value="">-- 팀을 선택하세요 --</option>
            {managedTeams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Division 선택 */}
        <div>
          <label
            htmlFor="division-select"
            className="block text-sm font-medium text-gray-700"
          >
            참가 구분 (Division)
          </label>
          <select
            id="division-select"
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            disabled={loading}
          >
            <option value="">-- 참가 구분을 선택하세요 --</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={!canSubmit}>
          {loading ? "신청 중…" : "참가 신청"}
        </Button>
      </form>
    </Card>
  );
}
