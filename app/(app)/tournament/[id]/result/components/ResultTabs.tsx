"use client";

import { useMemo, useState } from "react";
import MatchesTable from "./MatchesTable";
import StandingsTable from "./StandingsTable";
import EmptyState from "@/components/ui/EmptyState";
import type { MatchListRow } from "@/lib/api/matches";
import type { DivisionStandingsRow } from "@/lib/api/standings";

export type StandingSection = {
  divisionId: string;
  divisionName: string;
  standings: DivisionStandingsRow[];
};

type Props = {
  allMatches: MatchListRow[];
  courts: { id: string; name: string }[];
  divisions: { id: string; name: string }[];
  standingSections: StandingSection[];
  hasMultipleDivisions: boolean;
};

type Tab = "matches" | "standings";

const tabs: { id: Tab; label: string }[] = [
  { id: "matches", label: "경기 현황" },
  { id: "standings", label: "조별 순위" },
];

export default function ResultTabs({
  allMatches,
  courts,
  divisions,
  standingSections,
  hasMultipleDivisions,
}: Props) {
  const hasMatches = allMatches.length > 0;
  const hasStandings = standingSections.some((s) => s.standings.length > 0);

  const advancingTeamIds = useMemo(() => {
    const ids = new Set<string>();
    allMatches
      .filter((m) => m.groupType === "tournament")
      .forEach((m) => {
        if (m.team_a_id) ids.add(m.team_a_id);
        if (m.team_b_id) ids.add(m.team_b_id);
      });
    return ids;
  }, [allMatches]);

  const visibleTabs = tabs.filter((t) => {
    if (t.id === "matches") return hasMatches;
    if (t.id === "standings") return hasStandings;
    return false;
  });

  const [activeTab, setActiveTab] = useState<Tab>(
    visibleTabs[0]?.id ?? "matches"
  );

  if (visibleTabs.length === 0) {
    return <EmptyState message="등록된 경기 결과가 없습니다." />;
  }

  return (
    <div>
      {/* Tab Nav */}
      <div className="mb-4 flex border-b border-gray-200">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[#FF6B00] font-medium text-[#FF6B00]"
                : "border-b-2 border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "matches" && (
        <MatchesTable matches={allMatches} courts={courts} divisions={divisions} />
      )}

      {activeTab === "standings" && (
        <div className="space-y-8">
          {standingSections.length === 0 ? (
            <EmptyState message="아직 순위가 계산되지 않았습니다." />
          ) : (
            standingSections.map((section) => (
              <div key={section.divisionId}>
                {hasMultipleDivisions && (
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">
                    {section.divisionName}
                  </h3>
                )}
                {section.standings.length > 0 ? (
                  <StandingsTable
                    standings={section.standings}
                    advancingTeamIds={advancingTeamIds}
                  />
                ) : (
                  <EmptyState message="순위 데이터가 없습니다." />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
