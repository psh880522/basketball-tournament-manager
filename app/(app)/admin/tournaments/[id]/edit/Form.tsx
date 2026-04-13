"use client";

import { useState } from "react";
import { type TournamentEditRow } from "@/lib/api/tournaments";
import type { DivisionRow } from "@/lib/api/divisions";
import type { Court } from "@/lib/api/courts";
import type { DivisionApplicationCounts } from "@/lib/api/applications";
import BasicInfoTab from "./tabs/BasicInfoTab";
import DivisionsTab from "./tabs/DivisionsTab";
import CourtsTab from "./tabs/CourtsTab";
import PosterTab from "./tabs/PosterTab";
import PublishTab from "./tabs/PublishTab";

type ActiveTab = "basic" | "divisions" | "courts" | "poster" | "publish";

type TournamentEditFormProps = {
  tournament: TournamentEditRow;
  divisions: DivisionRow[];
  courts: Court[];
  applicationCounts: DivisionApplicationCounts[];
};

export default function TournamentEditForm({
  tournament,
  divisions,
  courts,
  applicationCounts,
}: TournamentEditFormProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "basic", label: "기본정보" },
    { key: "divisions", label: "디비전" },
    { key: "courts", label: "코트" },
    { key: "poster", label: "포스터" },
    { key: "publish", label: "공개설정" },
  ];

  const totalConfirmed = applicationCounts.reduce((sum, c) => sum + c.confirmed, 0);

  return (
    <div className="space-y-4">
      {/* 탭 네비게이션 */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === "basic" && (
        <BasicInfoTab tournament={tournament} />
      )}
      {activeTab === "divisions" && (
        <DivisionsTab
          tournamentId={tournament.id}
          initialDivisions={divisions}
          applicationCounts={applicationCounts}
        />
      )}
      {activeTab === "courts" && (
        <CourtsTab tournamentId={tournament.id} initialCourts={courts} />
      )}
      {activeTab === "poster" && (
        <PosterTab
          tournamentId={tournament.id}
          initialPosterUrl={tournament.poster_url ?? null}
        />
      )}
      {activeTab === "publish" && (
        <PublishTab
          tournamentId={tournament.id}
          currentStatus={tournament.status}
          divisionCount={divisions.length}
          totalConfirmed={totalConfirmed}
        />
      )}
    </div>
  );
}
