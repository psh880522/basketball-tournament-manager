import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getPendingTeams, getTournamentSummary } from "@/lib/api/teams";
import PendingTeamsForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentTeamsPage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;

  const tournament = await getTournamentSummary(id);

  if (tournament.error) {
    return <p style={{ color: "crimson" }}>{tournament.error}</p>;
  }

  if (!tournament.data) {
    return <p>Tournament not found.</p>;
  }

  const pending = await getPendingTeams(id);

  if (pending.error) {
    return <p style={{ color: "crimson" }}>{pending.error}</p>;
  }

  if (!pending.data || pending.data.length === 0) {
    return <p>대기 중인 신청이 없습니다.</p>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>{tournament.data.name}</h1>
      <p>Status: {tournament.data.status}</p>
      <PendingTeamsForm tournamentId={id} teams={pending.data} />
    </main>
  );
}
