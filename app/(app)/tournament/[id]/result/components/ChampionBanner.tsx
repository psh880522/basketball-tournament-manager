import { Trophy } from "lucide-react";
import Card from "@/components/ui/Card";

type ChampionEntry = {
  divisionName: string;
  first: string | null;
  second: string | null;
  third: string | null;
};

type Props = {
  champions: ChampionEntry[];
  hasMultipleDivisions: boolean;
  isOrganizer: boolean;
};

const RANKS = [
  { key: "first" as const, label: "우승", emoji: "🥇", textClass: "text-[#FF6B00] font-bold text-lg" },
  { key: "second" as const, label: "준우승", emoji: "🥈", textClass: "text-gray-700 font-semibold" },
  { key: "third" as const, label: "3위", emoji: "🥉", textClass: "text-gray-600 font-semibold" },
];

function DivisionResult({ entry }: { entry: ChampionEntry }) {
  const hasAny = entry.first || entry.second || entry.third;
  if (!hasAny) return null;

  return (
    <Card variant="highlight">
      <div className="space-y-2">
        {RANKS.map(({ key, label, emoji, textClass }) => {
          const teamName = entry[key];
          if (!teamName) return null;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xl">{emoji}</span>
              <span className="w-12 text-xs font-medium text-gray-400">{label}</span>
              <span className={textClass}>{teamName}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function ChampionBanner({
  champions,
  hasMultipleDivisions,
  isOrganizer,
}: Props) {
  const allUnconfirmed = champions.every((c) => !c.first);

  if (allUnconfirmed) {
    if (!isOrganizer) return null;
    return (
      <Card variant="muted">
        <div className="flex items-center gap-2 text-gray-500">
          <Trophy className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">우승팀 미확정</p>
            <p className="text-xs text-gray-400">대회가 진행 중입니다.</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!hasMultipleDivisions) {
    const entry = champions[0];
    if (!entry?.first) return null;
    return (
      <DivisionResult entry={entry} />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {champions
        .filter((c) => c.first)
        .map((c, i) => (
          <div key={i}>
            <p className="mb-1.5 text-xs font-semibold text-gray-500">{c.divisionName}</p>
            <DivisionResult entry={c} />
          </div>
        ))}
    </div>
  );
}
