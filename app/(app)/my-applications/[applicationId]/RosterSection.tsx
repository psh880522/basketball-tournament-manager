"use client";

import { useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import RosterPicker from "@/components/team/RosterPicker";
import type { RosterWithMembers } from "@/lib/types/roster";
import type { TeamMemberForRoster } from "@/lib/api/rosters";
import { saveRosterAction } from "./actions";

type Props = {
  applicationId: string;
  rosterId: string | null;
  rosterWithMembers: RosterWithMembers | null;
  teamMembers: TeamMemberForRoster[];
  isCaptain: boolean;
  isLocked: boolean;
};

export default function RosterSection({
  applicationId,
  rosterId,
  rosterWithMembers,
  teamMembers,
  isCaptain,
  isLocked,
}: Props) {
  const savedIds = (rosterWithMembers?.roster_members ?? []).map((m) => m.user_id);

  const [localIds, setLocalIds] = useState<string[]>(savedIds);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDirty =
    localIds.length !== savedIds.length ||
    localIds.some((id) => !savedIds.includes(id)) ||
    savedIds.some((id) => !localIds.includes(id));

  function handleAdd(userId: string) {
    setLocalIds((prev) => [...prev, userId]);
    setSaveSuccess(false);
  }

  function handleRemove(userId: string) {
    setLocalIds((prev) => prev.filter((id) => id !== userId));
    setSaveSuccess(false);
  }

  function handleSave() {
    if (!rosterId) {
      setSaveError("로스터 정보가 없습니다.");
      return;
    }

    const savedSet = new Set(savedIds);
    const localSet = new Set(localIds);

    const addIds = localIds.filter((id) => !savedSet.has(id));
    const removeIds = savedIds.filter((id) => !localSet.has(id));

    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const result = await saveRosterAction(applicationId, rosterId, addIds, removeIds);
      if (result.ok) {
        setSaveSuccess(true);
      } else {
        setSaveError(result.error);
      }
    });
  }

  /* 읽기 전용 멤버 목록 */
  function ReadonlyList({ ids }: { ids: string[] }) {
    const members = (rosterWithMembers?.roster_members ?? []).filter((m) =>
      ids.includes(m.user_id)
    );
    if (members.length === 0) {
      return <p className="text-sm text-gray-400">등록된 선수가 없습니다.</p>;
    }
    return (
      <ul className="space-y-1">
        {members.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-800">
              {m.verified_name ?? m.display_name ?? "이름 없음"}
            </span>
            {m.player_position && (
              <span className="text-xs text-gray-500">{m.player_position}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">로스터</h2>
        {isLocked && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
            대회 시작 후 잠금
          </span>
        )}
      </div>

      {isLocked ? (
        /* 잠금 상태 — 읽기 전용 */
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            대회가 시작되어 로스터를 수정할 수 없습니다.
          </p>
          <ReadonlyList ids={savedIds} />
        </div>
      ) : isCaptain ? (
        /* 편집 가능 — RosterPicker + 저장 버튼 */
        <div className="space-y-4">
          <RosterPicker
            allMembers={teamMembers}
            selectedIds={localIds}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          {saveSuccess && !isDirty && (
            <p className="text-sm text-green-600">저장되었습니다.</p>
          )}

          <Button
            onClick={handleSave}
            disabled={!isDirty || isPending || !rosterId}
          >
            {isPending ? "저장 중…" : "로스터 저장"}
          </Button>
        </div>
      ) : (
        /* 일반 팀원 — 읽기 전용 */
        <div className="space-y-2">
          {savedIds.length === 0 ? (
            <p className="text-sm text-gray-400">아직 등록된 선수가 없습니다.</p>
          ) : (
            <ReadonlyList ids={savedIds} />
          )}
        </div>
      )}
    </Card>
  );
}
