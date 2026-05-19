import Table from "@/components/ui/Table";
import type { DivisionStandingsRow } from "@/lib/api/standings";

type Props = {
  standings: DivisionStandingsRow[];
  advancingTeamIds?: Set<string>;
};

const rankRowBg: Record<number, string> = {
  1: "bg-amber-50",
  2: "bg-gray-50",
  3: "bg-orange-50/30",
};


const rankBadge: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-slate-100 text-slate-600",
  3: "bg-orange-100 text-orange-600",
};

function RankBadge({ rank, highlighted }: { rank: number; highlighted?: boolean }) {
  const base = "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold";
  const color = highlighted
    ? "bg-[#FF6B00] text-white"
    : (rankBadge[rank] ?? "bg-gray-100 text-gray-500");
  return <span className={`${base} ${color}`}>{rank}</span>;
}


function DiffPill({ diff }: { diff: number }) {
  const color =
    diff > 0
      ? "bg-emerald-50 text-emerald-700"
      : diff < 0
      ? "bg-rose-50 text-rose-600"
      : "bg-gray-100 text-gray-500";
  const label = diff > 0 ? `+${diff}` : String(diff);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {label}
    </span>
  );
}

export default function StandingsTable({ standings, advancingTeamIds }: Props) {
  const hasTournament = advancingTeamIds && advancingTeamIds.size > 0;

  function rowClassName(row: DivisionStandingsRow) {
    if (hasTournament) {
      return advancingTeamIds.has(row.team_id) ? "bg-orange-50/50" : "";
    }
    return rankRowBg[row.rank] ?? "";
  }

  function isHighlighted(row: DivisionStandingsRow) {
    return hasTournament ? advancingTeamIds.has(row.team_id) : row.rank <= 3;
  }

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell className="w-12 whitespace-nowrap text-center">순위</Table.HeadCell>
        <Table.HeadCell className="whitespace-nowrap">팀</Table.HeadCell>
        <Table.HeadCell className="hidden whitespace-nowrap text-center sm:table-cell">경기</Table.HeadCell>
        <Table.HeadCell className="whitespace-nowrap text-center">승</Table.HeadCell>
        <Table.HeadCell className="whitespace-nowrap text-center">패</Table.HeadCell>
        <Table.HeadCell className="hidden whitespace-nowrap text-center sm:table-cell">득점</Table.HeadCell>
        <Table.HeadCell className="hidden whitespace-nowrap text-center sm:table-cell">실점</Table.HeadCell>
        <Table.HeadCell className="whitespace-nowrap text-center">득실차</Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {standings.map((row) => (
          <Table.Row key={row.id} className={rowClassName(row)}>
            <Table.Cell className="text-center">
              <RankBadge
                rank={row.rank}
                highlighted={hasTournament ? advancingTeamIds.has(row.team_id) : row.rank <= 3}
              />
            </Table.Cell>
            <Table.Cell className={isHighlighted(row) ? "font-semibold text-gray-900" : "font-medium"}>
              {row.teams?.team_name ?? "TBD"}
            </Table.Cell>
            <Table.Cell className="hidden text-center tabular-nums text-gray-500 sm:table-cell">
              {row.wins + row.losses}
            </Table.Cell>
            <Table.Cell className="text-center tabular-nums font-medium text-emerald-600">
              {row.wins}
            </Table.Cell>
            <Table.Cell className="text-center tabular-nums text-rose-500">
              {row.losses}
            </Table.Cell>
            <Table.Cell className="hidden text-center tabular-nums text-gray-600 sm:table-cell">
              {row.points_for}
            </Table.Cell>
            <Table.Cell className="hidden text-center tabular-nums text-gray-600 sm:table-cell">
              {row.points_against}
            </Table.Cell>
            <Table.Cell className="text-center">
              <DiffPill diff={row.points_diff} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
