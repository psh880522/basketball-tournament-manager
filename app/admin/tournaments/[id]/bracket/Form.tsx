"use client";

import { useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  updateGroupSizeAction,
  generateDivisionMatches,
  previewDivisionAction,
  seedGroupSlotsFromBracketAction,
  seedTournamentSlotsFromBracketAction,
} from "./actions";
import type { PreviewResult } from "@/lib/api/bracketPreview";

type DivisionStat = {
  id: string;
  name: string;
  group_size: number;
  sort_order: number;
  approvedCount: number;
  matchCount: number;
};

type Message = { tone: "success" | "error"; text: string };

type Props = {
  tournamentId: string;
  divisions: DivisionStat[];
};

/* ── Preview Panel ── */

type PreviewData = Extract<PreviewResult, { ok: true }>;

function PreviewPanel({
  data,
  onClose,
}: {
  data: PreviewData;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-blue-800">미리보기</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-blue-600 hover:underline"
        >
          닫기
        </button>
      </div>

      {/* 요약 */}
      <div className="mb-3 grid grid-cols-4 gap-2 text-sm">
        <div className="rounded bg-white px-3 py-2 text-center">
          <div className="text-gray-500">승인 팀</div>
          <div className="text-lg font-bold">{data.totals.teamCount}</div>
        </div>
        <div className="rounded bg-white px-3 py-2 text-center">
          <div className="text-gray-500">그룹 크기</div>
          <div className="text-lg font-bold">{data.division.groupSize}</div>
        </div>
        <div className="rounded bg-white px-3 py-2 text-center">
          <div className="text-gray-500">조 개수</div>
          <div className="text-lg font-bold">{data.totals.groupCount}</div>
        </div>
        <div className="rounded bg-white px-3 py-2 text-center">
          <div className="text-gray-500">경기 수</div>
          <div className="text-lg font-bold">{data.totals.matchCount}</div>
        </div>
      </div>

      {/* 경고 */}
      {data.warnings.length > 0 && (
        <div className="mb-3 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          {data.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {/* 조 편성 */}
      <div className="space-y-2">
        {data.groupsPreview.map((g) => (
          <div key={g.groupIndex} className="rounded bg-white px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-sm font-medium">
              <span>{g.groupName}</span>
              <span className="text-gray-500">{g.matchCount}경기</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {g.teams.map((t) => (
                <span
                  key={t.teamId}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                >
                  {t.teamName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Form ── */

export default function BracketConsoleForm({
  tournamentId,
  divisions,
}: Props) {
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>(
    Object.fromEntries(divisions.map((d) => [d.id, d.group_size]))
  );
  const [messages, setMessages] = useState<Record<string, Message | null>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<
    Record<string, boolean>
  >({});
  const [assignTournament, setAssignTournament] = useState<
    Record<string, boolean>
  >({});
  const [previews, setPreviews] = useState<Record<string, PreviewData | null>>(
    {}
  );
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setMsg = (id: string, tone: Message["tone"], text: string) =>
    setMessages((prev) => ({ ...prev, [id]: { tone, text } }));
  const clearMsg = (id: string) =>
    setMessages((prev) => ({ ...prev, [id]: null }));

  /* ── group_size 저장 ── */
  const handleSaveGroupSize = (divisionId: string) => {
    const size = groupSizes[divisionId];
    if (!size || size < 2) {
      setMsg(divisionId, "error", "그룹 크기는 2 이상이어야 합니다.");
      return;
    }
    setSavingId(divisionId);
    clearMsg(divisionId);
    startTransition(async () => {
      const result = await updateGroupSizeAction(divisionId, size);
      if (result.ok) {
        setMsg(divisionId, "success", "그룹 크기가 저장되었습니다.");
      } else {
        setMsg(divisionId, "error", result.error);
      }
      setSavingId(null);
    });
  };

  /* ── 경기 생성 ── */
  const handleGenerate = (divisionId: string, overwrite: boolean) => {
    setGeneratingId(divisionId);
    clearMsg(divisionId);
    startTransition(async () => {
      const result = await generateDivisionMatches({
        tournamentId,
        divisionId,
        overwrite,
      });
      // redirect 성공 시 여기에 도달하지 않음
      if (!result.ok) {
        setMsg(divisionId, "error", result.error);
      }
      setGeneratingId(null);
      setConfirmOverwrite((prev) => ({ ...prev, [divisionId]: false }));
    });
  };

  const handleSeedGroupSlots = (divisionId: string) => {
    clearMsg(divisionId);
    startTransition(async () => {
      const result = await seedGroupSlotsFromBracketAction({
        tournamentId,
        divisionId,
      });
      if (result.ok) {
        setMsg(divisionId, "success", "리그 슬롯이 반영되었습니다.");
      } else {
        setMsg(divisionId, "error", result.error);
      }
    });
  };

  const handleSeedTournamentSlots = (divisionId: string) => {
    clearMsg(divisionId);
    const assignToTournament = assignTournament[divisionId] ?? true;
    startTransition(async () => {
      const result = await seedTournamentSlotsFromBracketAction({
        tournamentId,
        divisionId,
        assignToTournament,
      });
      if (result.ok) {
        setMsg(divisionId, "success", "토너먼트 슬롯이 반영되었습니다.");
      } else {
        setMsg(divisionId, "error", result.error);
      }
    });
  };

  /* ── 미리보기 ── */
  const handlePreview = (divisionId: string) => {
    // 토글: 이미 열려있으면 닫기
    if (previews[divisionId]) {
      setPreviews((prev) => ({ ...prev, [divisionId]: null }));
      return;
    }
    setPreviewingId(divisionId);
    clearMsg(divisionId);
    startTransition(async () => {
      const result = await previewDivisionAction({
        tournamentId,
        divisionId,
        groupSize: groupSizes[divisionId],
      });
      if (result.ok) {
        setPreviews((prev) => ({ ...prev, [divisionId]: result }));
      } else {
        setMsg(divisionId, "error", result.error);
      }
      setPreviewingId(null);
    });
  };

  return (
    <div className="space-y-4">
      {divisions.map((div) => {
        const msg = messages[div.id];
        const isSaving = isPending && savingId === div.id;
        const isGenerating = isPending && generatingId === div.id;
        const isPreviewing = isPending && previewingId === div.id;
        const isBusy = isSaving || isGenerating || isPreviewing;
        const isConfirming = confirmOverwrite[div.id] ?? false;
        const preview = previews[div.id] ?? null;

        return (
          <Card key={div.id}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{div.name}</h3>
              <div className="flex gap-3 text-sm text-gray-500">
                <span>승인 팀 {div.approvedCount}</span>
                <span>경기 {div.matchCount}</span>
              </div>
            </div>

            {/* group_size quick edit */}
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm text-gray-600">그룹 크기</label>
              <input
                type="number"
                min={2}
                value={groupSizes[div.id] ?? div.group_size}
                onChange={(e) =>
                  setGroupSizes((prev) => ({
                    ...prev,
                    [div.id]: parseInt(e.target.value, 10) || 2,
                  }))
                }
                className="w-20 rounded border px-2 py-1 text-sm"
                disabled={isBusy}
              />
              <Button
                variant="secondary"
                onClick={() => handleSaveGroupSize(div.id)}
                disabled={isBusy}
              >
                {isSaving ? "저장 중…" : "저장"}
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={() => handlePreview(div.id)}
                disabled={isBusy}
              >
                {isPreviewing
                  ? "로딩 중…"
                  : preview
                    ? "미리보기 닫기"
                    : "미리보기"}
              </Button>

              <Button
                onClick={() => handleGenerate(div.id, false)}
                disabled={isBusy}
              >
                {isGenerating && !isConfirming ? "생성 중…" : "경기 생성"}
              </Button>

              {!isConfirming ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setConfirmOverwrite((prev) => ({
                      ...prev,
                      [div.id]: true,
                    }))
                  }
                  disabled={isBusy}
                >
                  덮어쓰기 재생성
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-700">
                    기존 경기가 삭제되고 재생성됩니다
                  </span>
                  <Button
                    onClick={() => handleGenerate(div.id, true)}
                    disabled={isGenerating}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isGenerating ? "재생성 중…" : "확인"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setConfirmOverwrite((prev) => ({
                        ...prev,
                        [div.id]: false,
                      }))
                    }
                    disabled={isGenerating}
                  >
                    취소
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleSeedGroupSlots(div.id)}
                  disabled={isBusy}
                >
                  리그 슬롯 반영
                </Button>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={assignTournament[div.id] ?? true}
                    onChange={(event) =>
                      setAssignTournament((prev) => ({
                        ...prev,
                        [div.id]: event.target.checked,
                      }))
                    }
                  />
                  토너먼트 매치 연결
                </label>
                <Button
                  variant="secondary"
                  onClick={() => handleSeedTournamentSlots(div.id)}
                  disabled={isBusy}
                >
                  토너먼트 슬롯 반영
                </Button>
              </div>
            </div>

            {/* Preview Panel */}
            {preview && (
              <PreviewPanel
                data={preview}
                onClose={() =>
                  setPreviews((prev) => ({ ...prev, [div.id]: null }))
                }
              />
            )}

            {/* Message */}
            {msg && (
              <p
                className={`mt-3 text-sm ${
                  msg.tone === "error" ? "text-red-600" : "text-green-600"
                }`}
              >
                {msg.text}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
