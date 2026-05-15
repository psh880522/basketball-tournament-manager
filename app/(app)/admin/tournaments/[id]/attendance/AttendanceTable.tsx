"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import type { AttendanceRow } from "@/lib/api/attendance";
import { toggleAttendanceAction } from "./actions";

type Props = {
  teams: AttendanceRow[];
  tournamentId: string;
  isFinished: boolean;
};

export default function AttendanceTable({
  teams,
  tournamentId,
  isFinished,
}: Props) {
  const [localAttended, setLocalAttended] = useState<Record<string, boolean>>(
    () => Object.fromEntries(teams.map((t) => [t.team_id, t.attended]))
  );
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>(
    {}
  );
  const [, startTransition] = useTransition();

  const kpis = useMemo(() => {
    const total = teams.length;
    const checked = Object.values(localAttended).filter(Boolean).length;
    return { total, checked, unchecked: total - checked };
  }, [teams.length, localAttended]);

  const handleToggle = (teamId: string) => {
    if (isFinished || pendingTeamId === teamId) return;

    const prevValue = localAttended[teamId] ?? false;
    const nextValue = !prevValue;

    setPendingTeamId(teamId);
    setLocalAttended((prev) => ({ ...prev, [teamId]: nextValue }));

    startTransition(async () => {
      const result = await toggleAttendanceAction(
        tournamentId,
        teamId,
        nextValue
      );
      if (!result.ok) {
        setLocalAttended((prev) => ({ ...prev, [teamId]: prevValue }));
        setErrorMessages((prev) => ({
          ...prev,
          [teamId]: result.error ?? "저장 실패",
        }));
        setTimeout(() => {
          setErrorMessages((prev) => {
            const next = { ...prev };
            delete next[teamId];
            return next;
          });
        }, 1500);
      }
      setPendingTeamId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <section aria-label="출석 요약">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card variant="muted" className="space-y-1">
            <p className="text-xs text-gray-500">전체 팀</p>
            <p className="text-lg font-semibold text-gray-900">{kpis.total}팀</p>
            <p className="text-xs text-gray-400">참가 확정</p>
          </Card>
          <Card variant="muted" className="space-y-1">
            <p className="text-xs text-gray-500">출석 확인</p>
            <p className="text-lg font-semibold text-gray-900">
              {kpis.checked}팀
            </p>
            <p className="text-xs text-gray-400">출석 체크됨</p>
          </Card>
          <Card variant="muted" className="space-y-1">
            <p className="text-xs text-gray-500">미확인</p>
            <p
              className={`text-lg font-semibold ${
                kpis.unchecked > 0 ? "text-rose-600" : "text-gray-900"
              }`}
            >
              {kpis.unchecked}팀
            </p>
            <p className="text-xs text-gray-400">체크 안됨</p>
          </Card>
        </div>
      </section>

      {/* 헤더 액션 줄 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">팀 목록</h2>
        <a
          href={`/api/admin/tournaments/${tournamentId}/attendance/export`}
          download
          aria-label="출석 목록 Excel 내보내기"
        >
          <Button variant="secondary" className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            Excel 내보내기
          </Button>
        </a>
      </div>

      {/* 대회 종료 안내 */}
      {isFinished && (
        <p className="text-xs text-gray-500">
          대회가 종료된 이후에는 출석 기록을 수정할 수 없습니다.
        </p>
      )}

      {/* 테이블 */}
      {teams.length === 0 ? (
        <EmptyState message="확정된 참가팀이 없습니다." />
      ) : (
        <Table>
          <Table.Head>
            <Table.HeadCell>디비전</Table.HeadCell>
            <Table.HeadCell>조</Table.HeadCell>
            <Table.HeadCell>팀명</Table.HeadCell>
            <Table.HeadCell>주장이름</Table.HeadCell>
            <Table.HeadCell>연락처</Table.HeadCell>
            <Table.HeadCell className="text-center">출석</Table.HeadCell>
          </Table.Head>
          <Table.Body>
            {teams.map((team) => (
              <Table.Row key={team.team_id}>
                <Table.Cell>{team.division_name}</Table.Cell>
                <Table.Cell>{team.group_name ?? "—"}</Table.Cell>
                <Table.Cell className="font-medium">{team.team_name}</Table.Cell>
                <Table.Cell>{team.captain_name ?? "-"}</Table.Cell>
                <Table.Cell>{team.contact}</Table.Cell>
                <Table.Cell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <label className="flex cursor-pointer items-center justify-center p-1">
                      <input
                        type="checkbox"
                        checked={localAttended[team.team_id] ?? false}
                        onChange={() => handleToggle(team.team_id)}
                        disabled={
                          isFinished || pendingTeamId === team.team_id
                        }
                        aria-label={`${team.team_name} 출석 체크`}
                        aria-disabled={isFinished}
                        className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    {errorMessages[team.team_id] && (
                      <p
                        role="alert"
                        className="text-xs text-red-500"
                      >
                        {errorMessages[team.team_id]}
                      </p>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* 결과 입력으로 이동 */}
      <div className="flex justify-end">
        <Link href={`/admin/tournaments/${tournamentId}/result`}>
          <Button variant="secondary">결과 입력으로 이동 →</Button>
        </Link>
      </div>
    </div>
  );
}
