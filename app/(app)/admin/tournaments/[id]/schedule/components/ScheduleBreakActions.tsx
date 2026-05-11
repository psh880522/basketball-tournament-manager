"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { DivisionRow } from "@/lib/api/divisions";
import type { ScheduleSlotGroupOption } from "@/lib/api/schedule-slots";
import { seedBreakSlotsAction } from "../actions";

type Props = {
  tournamentId: string;
  divisions: DivisionRow[];
  groups: ScheduleSlotGroupOption[];
};

type Message = { tone: "success" | "error"; text: string } | null;

export default function ScheduleBreakActions({
  tournamentId,
  divisions,
  groups,
}: Props) {
  const router = useRouter();
  const [divisionId, setDivisionId] = useState("");
  const [stageType, setStageType] = useState<"group" | "tournament">("group");
  const [groupKey, setGroupKey] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const availableGroups = useMemo(
    () => groups.filter((group) => group.division_id === divisionId),
    [groups, divisionId]
  );

  const handleSubmit = () => {
    setMessage(null);

    if (!divisionId) {
      setMessage({ tone: "error", text: "디비전을 선택하세요." });
      return;
    }

    if (stageType === "group" && !groupKey) {
      setMessage({ tone: "error", text: "조를 선택하세요." });
      return;
    }

    startTransition(async () => {
      const result = await seedBreakSlotsAction(
        tournamentId,
        divisionId,
        stageType,
        stageType === "group" ? groupKey : null
      );

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "휴식시간이 추가되었습니다." });
      router.refresh();
    });
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">휴식시간 생성</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">디비전</label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={divisionId}
            onChange={(event) => {
              setDivisionId(event.target.value);
              setGroupKey("");
              setMessage(null);
            }}
          >
            <option value="">선택</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">섹션</label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={stageType}
            onChange={(event) => {
              setStageType(event.target.value as "group" | "tournament");
              setMessage(null);
            }}
          >
            <option value="group">group</option>
            <option value="tournament">tournament</option>
          </select>
        </div>
        {stageType === "group" ? (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">조</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={groupKey}
              onChange={(event) => setGroupKey(event.target.value)}
            >
              <option value="">선택</option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "생성 중..." : "생성"}
        </Button>
      </div>
      {message && (
        <p
          className={`text-sm ${
            message.tone === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {message.text}
        </p>
      )}
      {stageType === "group" && divisionId && availableGroups.length === 0 ? (
        <p className="text-xs text-gray-400">해당 디비전에 조가 없습니다.</p>
      ) : null}
    </Card>
  );
}