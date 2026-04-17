import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import type { TeamMember } from "@/lib/api/rosters";

const ROLE_BADGE: Record<string, { text: string; className: string }> = {
  captain: { text: "주장", className: "bg-blue-100 text-blue-700" },
  player:  { text: "선수", className: "bg-gray-100 text-gray-600" },
};

const CAREER_LABEL: Record<string, string> = {
  beginner:  "입문",
  amateur:   "아마추어",
  semi_pro:  "세미프로",
  pro:       "프로",
};

function displayName(member: TeamMember): string {
  return member.verified_name ?? member.display_name ?? "이름 없음";
}

export default function TeamMemberTable({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
        등록된 선수가 없습니다.
      </p>
    );
  }

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell className="w-1/3">이름</Table.HeadCell>
        <Table.HeadCell className="text-center">역할</Table.HeadCell>
        <Table.HeadCell className="text-center">포지션</Table.HeadCell>
        <Table.HeadCell className="text-center">레벨</Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {members.map((m) => {
          const badge = ROLE_BADGE[m.role_in_team] ?? ROLE_BADGE.player;
          return (
            <Table.Row key={m.user_id}>
              <Table.Cell className="w-1/3 font-medium text-gray-900">
                {displayName(m)}
              </Table.Cell>
              <Table.Cell className="text-center">
                <Badge className={badge.className}>{badge.text}</Badge>
              </Table.Cell>
              <Table.Cell className="text-center">{m.player_position ?? "-"}</Table.Cell>
              <Table.Cell className="text-center">
                {m.career_level ? (CAREER_LABEL[m.career_level] ?? m.career_level) : "-"}
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
