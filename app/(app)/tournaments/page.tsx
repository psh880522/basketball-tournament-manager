import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isOperationRole } from "@/src/lib/auth/roles";
import { getOpenTournaments, getMyParticipatedTournaments } from "@/lib/api/tournaments";
import type { PublicTournamentRow, MyParticipatedTournamentRow } from "@/lib/api/tournaments";
import Card from "@/components/ui/Card";

export const dynamic = "force-dynamic";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "날짜 미정";
  const s = new Date(start).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  return `${s} ~ ${e}`;
}

function TournamentCard({ tournament, badge }: { tournament: PublicTournamentRow; badge?: string }) {
  return (
    <Link href={`/tournament/${tournament.id}`}>
      <Card className="flex items-center justify-between gap-4 transition-colors hover:bg-white">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-slate-900">{tournament.name}</p>
            {badge && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {formatDateRange(tournament.start_date, tournament.end_date)}
            {tournament.location && ` · ${tournament.location}`}
          </p>
        </div>
        <svg
          className="h-4 w-4 shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Card>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
      {message}
    </p>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-base font-semibold text-slate-700">{title}</h2>;
}

export default async function TournamentsPage() {
  const result = await getUserWithRole();
  if (result.status === "unauthenticated") redirect("/login");
  if (isOperationRole(result.role)) redirect("/admin");

  const isPlayer = isPlayerRole(result.role);

  const [openResult, myResult] = await Promise.all([
    getOpenTournaments(),
    isPlayer ? getMyParticipatedTournaments() : Promise.resolve(null),
  ]);

  const openTournaments = openResult.data ?? [];
  const participating = myResult?.data?.participating ?? [];
  const past = myResult?.data?.past ?? [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">대회</h1>
        </header>

        {/* 모집중인 대회 */}
        <section className="space-y-3">
          <SectionHeader title="모집중인 대회" />
          {openResult.error ? (
            <p className="text-sm text-red-500">{openResult.error}</p>
          ) : openTournaments.length === 0 ? (
            <EmptyState message="현재 모집 중인 대회가 없습니다." />
          ) : (
            <div className="space-y-2">
              {openTournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </section>

        {/* 참가중인 대회 (player만) */}
        {isPlayer && (
          <section className="space-y-3">
            <SectionHeader title="참가중인 대회" />
            {participating.length === 0 ? (
              <EmptyState message="현재 참가 중인 대회가 없습니다." />
            ) : (
              <div className="space-y-2">
                {participating.map((t: MyParticipatedTournamentRow) => (
                  <TournamentCard key={t.id} tournament={t} badge={t.team_name} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 참가 했던 대회 (player만) */}
        {isPlayer && (
          <section className="space-y-3">
            <SectionHeader title="참가 했던 대회" />
            {past.length === 0 ? (
              <EmptyState message="참가 이력이 없습니다." />
            ) : (
              <div className="space-y-2">
                {past.map((t: MyParticipatedTournamentRow) => (
                  <TournamentCard key={t.id} tournament={t} badge={t.team_name} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
