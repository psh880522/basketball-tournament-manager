import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getDivisionsByTournament } from "@/lib/api/bracket";
import BracketGeneratorForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BracketPage({ params }: PageProps) {
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
  const divisions = await getDivisionsByTournament(id);

  if (divisions.error) {
    return <p style={{ color: "crimson" }}>{divisions.error}</p>;
  }

  if (!divisions.data || divisions.data.length === 0) {
    return <p>No divisions found for this tournament.</p>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Bracket Generator</h1>
      <BracketGeneratorForm tournamentId={id} divisions={divisions.data} />
    </main>
  );
}
