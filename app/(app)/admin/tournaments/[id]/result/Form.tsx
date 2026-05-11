"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { LeagueMatchRow } from "@/lib/api/results";
import {
  calculateLeagueStandingsAction,
  saveLeagueResultsAction,
} from "./actions";

type Props = {
  tournamentId: string;
  divisionId: string;
  isOrganizer: boolean;
  standingsDirty: boolean;
  matches: LeagueMatchRow[];
};

type Message = { tone: "success" | "error"; text: string } | null;

type ScoreState = {
  scoreA: string;
  scoreB: string;
};

const statusLabel = (status: string): string =>
  status === "completed" ? "완료" : "미완료";

const statusClass = (status: string): string =>
  status === "completed"
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-600";

export default function ResultForm({
  tournamentId,
  divisionId,
  isOrganizer,
  standingsDirty,
  matches,
}: Props) {
  const [message, setMessage] = useState<Message>(null);
  const [isSaving, startSaving] = useTransition();
  const [isCalculating, startCalculating] = useTransition();
  const [scores, setScores] = useState<Record<string, ScoreState>>({});

  const editableMatches = matches.filter((match) => match.stage_type === "group");

  const initialScores = useMemo(() => {
    const next: Record<string, ScoreState> = {};
    editableMatches.forEach((match) => {
      next[match.id] = {
        scoreA: match.score_a !== null ? String(match.score_a) : "",
        scoreB: match.score_b !== null ? String(match.score_b) : "",
      };
    });
    return next;
  }, [editableMatches]);

  useEffect(() => {
    if (editableMatches.length === 0) return;
    setScores((prev) => {
      let changed = false;
      const next: Record<string, ScoreState> = { ...prev };

      Object.entries(initialScores).forEach(([matchId, score]) => {
        const current = prev[matchId];
        if (!current) {
          next[matchId] = score;
          changed = true;
          return;
        }
        if (current.scoreA !== score.scoreA || current.scoreB !== score.scoreB) {
          next[matchId] = score;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [editableMatches, initialScores]);

  const handleScoreChange = (matchId: string, key: "scoreA" | "scoreB", value: string) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        scoreA: prev[matchId]?.scoreA ?? "",
        scoreB: prev[matchId]?.scoreB ?? "",
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    setMessage(null);

    const results = editableMatches
      .map((match) => {
        const score = scores[match.id] ?? { scoreA: "", scoreB: "" };
        if (score.scoreA === "" || score.scoreB === "") {
          return null;
        }
        const scoreA = Number(score.scoreA);
        const scoreB = Number(score.scoreB);
        if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
          return null;
        }
        return {
          matchId: match.id,
          scoreA,
          scoreB,
        };
      })
      .filter((result): result is { matchId: string; scoreA: number; scoreB: number } =>
        result !== null
      );

    if (results.length === 0) {
      setMessage({ tone: "error", text: "저장할 점수가 없습니다." });
      return;
    }

    startSaving(async () => {
      const result = await saveLeagueResultsAction({
        tournamentId,
        divisionId,
        results,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "리그 경기 결과가 저장되었습니다." });
    });
  };

  const handleCalculate = () => {
    setMessage(null);
    startCalculating(async () => {
      const result = await calculateLeagueStandingsAction({
        tournamentId,
        divisionId,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: "리그 순위가 계산되었습니다." });
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">리그 결과 입력</h2>
            <p className="text-xs text-gray-500">
              리그 경기만 표시됩니다.
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {standingsDirty ? "순위 재계산 필요" : "최신 순위"}
          </span>
        </div>

        {editableMatches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">리그 경기가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-white text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-3 py-2">경기</th>
                  <th className="px-3 py-2 text-center" colSpan={3}>
                    스코어
                  </th>
                  <th className="px-3 py-2">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {editableMatches.map((match) => (
                  <tr key={match.id} className="hover:bg-white">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium">
                        {match.team_a?.team_name ?? "TBD"}
                      </span>
                      <span className="text-gray-400 mx-1">vs</span>
                      <span className="font-medium">
                        {match.team_b?.team_name ?? "TBD"}
                      </span>
                    </td>
                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                        value={scores[match.id]?.scoreA ?? ""}
                        onChange={(event) =>
                          handleScoreChange(match.id, "scoreA", event.target.value)
                        }
                        disabled={!isOrganizer || isSaving}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-1 py-2 text-gray-400 text-center">:</td>
                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                        value={scores[match.id]?.scoreB ?? ""}
                        onChange={(event) =>
                          handleScoreChange(match.id, "scoreB", event.target.value)
                        }
                        disabled={!isOrganizer || isSaving}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded ${statusClass(
                          match.status
                        )}`}
                      >
                        {statusLabel(match.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isOrganizer && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        )}
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">리그 순위 계산</h2>
          <p className="text-xs text-gray-500">
            현재 저장된 리그 경기 결과만 기준으로 계산됩니다.
          </p>
        </div>
        {isOrganizer ? (
          <Button onClick={handleCalculate} disabled={isCalculating}>
            {isCalculating ? "계산 중..." : "리그 순위 계산"}
          </Button>
        ) : (
          <p className="text-sm text-gray-500">권한이 없습니다.</p>
        )}
      </Card>

      {message && (
        <Card
          className={`text-sm ${
            message.tone === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {message.text}
        </Card>
      )}
    </div>
  );
}
