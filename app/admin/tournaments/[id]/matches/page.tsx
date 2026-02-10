import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getMatchesByTournament } from "@/lib/api/matches";
import MatchResultForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentMatchesPage({ params }: PageProps) {
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
  const matches = await getMatchesByTournament(id);

  if (matches.error) {
    return <p style={{ color: "crimson" }}>{matches.error}</p>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Match Result Input</h1>
      <MatchResultForm matches={matches.data ?? []} />
    </main>
  );
}
