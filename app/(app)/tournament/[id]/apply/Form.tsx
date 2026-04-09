"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { ManagedTeamRow } from "@/lib/api/teams";
import type { MyApplicationRow } from "@/lib/api/applications";
import type { DivisionRow } from "@/lib/api/divisions";
import { applyTeamToTournament } from "./actions";
import StatusCard from "./StatusCard";

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

  /* 신청 성공 후 자동으로 서버 데이터 갱신 */
  useEffect(() => {
    if (success) {
      router.refresh();
    }
  }, [success, router]);

  /* 취소/만료 후 router.refresh()로 existingApp이 null로 바뀌면 success 리셋
     (신청 직후 existingApp=null 상태와 구분하기 위해 이전 값 추적) */
  const prevExistingAppRef = useRef(existingApp);
  useEffect(() => {
    const prev = prevExistingAppRef.current;
    prevExistingAppRef.current = existingApp;
    if (success && prev !== null && existingApp === null) {
      setSuccess(false);
    }
  }, [existingApp, success]);

  /* 이미 신청한 경우 — 6-state StatusCard */
  if (existingApp) {
    return <StatusCard app={existingApp} tournamentId={tournamentId} />;
  }

  /* 팀이 없는 경우 */
  if (managedTeams.length === 0) {
    return <NoTeamsGuide />;
  }

  /* Division 없는 경우 */
  if (divisions.length === 0) {
    return <NoDivisionsGuide />;
  }

  /* 신청 성공 후 (router.refresh() 결과 대기 중) */
  if (success) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-green-700 font-medium">
          참가 신청이 완료되었습니다!
        </p>
        <p className="text-xs text-gray-500">신청 현황을 불러오는 중...</p>
      </Card>
    );
  }

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const canSubmit = !!selectedTeamId && !!selectedDivisionId && !loading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
                {d.entry_fee > 0 ? ` (${d.entry_fee.toLocaleString()}원)` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Division 상세 정보 */}
        {selectedDivision && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-800">참가비:</span>{" "}
              {selectedDivision.entry_fee > 0
                ? `${selectedDivision.entry_fee.toLocaleString()}원`
                : "무료"}
            </p>
            <p>
              <span className="font-medium text-gray-800">정원:</span>{" "}
              {selectedDivision.capacity != null
                ? `${selectedDivision.capacity}팀`
                : "무제한"}
            </p>
            {(selectedDivision.application_open_at || selectedDivision.application_close_at) && (
              <p>
                <span className="font-medium text-gray-800">신청 기간:</span>{" "}
                {selectedDivision.application_open_at
                  ? new Date(selectedDivision.application_open_at).toLocaleDateString("ko-KR")
                  : ""}
                {selectedDivision.application_close_at &&
                  ` ~ ${new Date(selectedDivision.application_close_at).toLocaleDateString("ko-KR")}`}
              </p>
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
