"use client";

import { useState, useTransition } from "react";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import type { TeamMemberForRoster } from "@/lib/api/rosters";

const CAREER_LABEL: Record<string, string> = {
  beginner: "입문",
  amateur: "아마추어",
  semi_pro: "세미프로",
  pro: "프로",
};

const ROLE_BADGE: Record<string, { text: string; className: string }> = {
  captain: { text: "주장", className: "bg-blue-100 text-blue-700" },
  player:  { text: "선수", className: "bg-gray-100 text-gray-600" },
};

function memberDisplayName(m: TeamMemberForRoster) {
  return m.verified_name ?? m.display_name ?? "이름 없음";
}

/* ── 단일 행 ─────────────────────────────────────── */

type ActionResult = { ok: boolean; error?: string };
type OnAction = (userId: string) => void | Promise<ActionResult>;

function MemberRow({
  member,
  actionLabel,
  actionClassName,
  onAction,
}: {
  member: TeamMemberForRoster;
  actionLabel: string;
  actionClassName: string;
  onAction: OnAction;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    const result = onAction(member.user_id);
    if (result instanceof Promise) {
      startTransition(async () => {
        const res = await result;
        if (!res.ok && res.error) setError(res.error);
      });
    }
  };

  const badge = ROLE_BADGE[member.role_in_team] ?? ROLE_BADGE.player;

  return (
    <Table.Row>
      <Table.Cell className="w-1/3 font-medium text-gray-900">
        <div>
          {memberDisplayName(member)}
          {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
        </div>
      </Table.Cell>
      <Table.Cell className="text-center">
        <Badge className={badge.className}>{badge.text}</Badge>
      </Table.Cell>
      <Table.Cell className="text-center">{member.player_position ?? "-"}</Table.Cell>
      <Table.Cell className="text-center">
        {member.career_level ? (CAREER_LABEL[member.career_level] ?? member.career_level) : "-"}
      </Table.Cell>
      <Table.Cell className="w-16 text-center">
        <button
          type="button"
          className={`${actionClassName} disabled:opacity-40`}
          onClick={handleClick}
          disabled={isPending}
        >
          {isPending ? "..." : actionLabel}
        </button>
      </Table.Cell>
    </Table.Row>
  );
}

/* ── 멤버 테이블 ─────────────────────────────────── */

function MemberTable({
  members,
  actionLabel,
  actionClassName,
  onAction,
  emptyMessage,
}: {
  members: TeamMemberForRoster[];
  actionLabel: string;
  actionClassName: string;
  onAction: OnAction;
  emptyMessage: string;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell className="w-1/3">이름</Table.HeadCell>
        <Table.HeadCell className="text-center">역할</Table.HeadCell>
        <Table.HeadCell className="text-center">포지션</Table.HeadCell>
        <Table.HeadCell className="text-center">레벨</Table.HeadCell>
        <Table.HeadCell className="w-16 text-center" />
      </Table.Head>
      <Table.Body>
        {members.map((m) => (
          <MemberRow
            key={m.user_id}
            member={m}
            actionLabel={actionLabel}
            actionClassName={actionClassName}
            onAction={onAction}
          />
        ))}
      </Table.Body>
    </Table>
  );
}

/* ── RosterPicker (공통 컴포넌트) ────────────────── */

export type RosterPickerProps = {
  /** 팀 전체 멤버 */
  allMembers: TeamMemberForRoster[];
  /** 현재 출전 선수 user_id 목록 */
  selectedIds: string[];
  /**
   * 선수 추가 콜백.
   * 동기(void) 또는 비동기(Promise<{ok, error?}>)를 모두 지원.
   * 비동기 실패 시 에러를 행 아래에 인라인 표시.
   */
  onAdd: OnAction;
  /** 선수 제거 콜백 (onAdd와 동일 시그니처) */
  onRemove: OnAction;
};

export default function RosterPicker({
  allMembers,
  selectedIds,
  onAdd,
  onRemove,
}: RosterPickerProps) {
  const selectedSet = new Set(selectedIds);
  const available = allMembers.filter((m) => !selectedSet.has(m.user_id));
  const selected = allMembers.filter((m) => selectedSet.has(m.user_id));

  return (
    <div className="space-y-4">
      {/* 팀원 목록 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-700">
          팀원 목록 <span className="text-gray-400">({available.length}명)</span>
        </p>
        <MemberTable
          members={available}
          actionLabel="추가"
          actionClassName="text-xs font-medium text-blue-600 hover:text-blue-800"
          onAction={onAdd}
          emptyMessage="추가할 수 있는 팀원이 없습니다."
        />
      </div>

      {/* 출전 선수 목록 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-700">
          출전 선수 목록{" "}
          <span className="text-gray-400">({selected.length}명)</span>
        </p>
        <MemberTable
          members={selected}
          actionLabel="제거"
          actionClassName="text-xs font-medium text-red-500 hover:text-red-700"
          onAction={onRemove}
          emptyMessage="출전할 선수를 위에서 추가해주세요."
        />
      </div>
    </div>
  );
}
