import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getCourtsByTournament } from "@/lib/api/courts";
import CourtsForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentCourtsPage({ params }: PageProps) {
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
  const courts = await getCourtsByTournament(id);

  if (courts.error) {
    return <p style={{ color: "crimson" }}>{courts.error}</p>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Courts</h1>
      <CourtsForm tournamentId={id} courts={courts.data ?? []} />
    </main>
  );
}
