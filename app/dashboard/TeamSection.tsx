"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CreateTeamForm from "./Form";
import type { MyTeamRow } from "@/lib/api/teams";

export default function TeamSection({
  teams,
  fetchError,
}: {
  teams: MyTeamRow[];
  fetchError: string | null;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">내 팀</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>+ 팀 만들기</Button>
        )}
      </div>

      {/* 팀 생성 폼 */}
      {showForm && (
        <Card>
          <CreateTeamForm onCancel={() => setShowForm(false)} />
        </Card>
      )}

      {/* 에러 */}
      {fetchError && (
        <p className="text-sm text-red-600">팀 목록을 불러오지 못했습니다: {fetchError}</p>
      )}

      {/* 빈 상태 */}
      {!fetchError && teams.length === 0 && (
        <Card className="py-8 text-center">
          <p className="text-sm text-gray-500">아직 팀이 없습니다. 팀을 만들어보세요.</p>
        </Card>
      )}

      {/* 팀 목록 */}
      {teams.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.team_id} className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">{team.team_name}</p>
                <Badge
                  className={
                    team.role_in_team === "captain"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }
                >
                  {team.role_in_team === "captain" ? "주장" : "선수"}
                </Badge>
              </div>
              <Link href={`/teams/${team.team_id}`}>
                <Button variant="secondary">선수 관리</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
