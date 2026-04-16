"use client";

import { useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { TeamForJoinRow } from "@/lib/api/team-applications";
import { applyForTeamAction } from "./actions";

export default function SearchSection({
  teams,
  pendingTeamIds,
}: {
  teams: TeamForJoinRow[];
  pendingTeamIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ teamId: string; message: string; ok: boolean } | null>(null);

  const filtered = query.trim()
    ? teams.filter((t) =>
        t.team_name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : teams;

  function handleApply(teamId: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await applyForTeamAction(teamId);
      setFeedback({
        teamId,
        message: result.ok ? "합류 신청이 완료되었습니다." : result.error,
        ok: result.ok,
      });
    });
  }

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="팀 이름으로 검색"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      />

      {/* 팀 목록 */}
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          {query ? "검색 결과가 없습니다." : "합류 가능한 팀이 없습니다."}
        </p>
      )}

      {filtered.map((team) => {
        const isApplied = pendingTeamIds.includes(team.id);
        const isCurrent = feedback?.teamId === team.id;

        return (
          <Card key={team.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{team.team_name}</p>
                <div className="flex flex-wrap gap-1">
                  {team.region && (
                    <Badge className="bg-gray-100 text-gray-600">
                      {team.region}
                    </Badge>
                  )}
                  <Badge className="bg-gray-100 text-gray-600">
                    멤버 {team.member_count}명
                  </Badge>
                </div>
                {team.bio && (
                  <p className="text-xs text-slate-500 line-clamp-2">{team.bio}</p>
                )}
              </div>

              <div className="shrink-0">
                {isApplied || (isCurrent && feedback?.ok) ? (
                  <span className="text-xs text-gray-400">신청 완료</span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleApply(team.id)}
                    disabled={isPending}
                  >
                    신청하기
                  </Button>
                )}
              </div>
            </div>

            {/* 피드백 메시지 */}
            {isCurrent && feedback && (
              <p
                className={`text-xs ${feedback.ok ? "text-emerald-600" : "text-red-600"}`}
              >
                {feedback.message}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
