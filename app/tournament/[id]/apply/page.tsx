import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import ApplyTeamForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentApplyPage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "team_manager") redirect("/dashboard");

  const { id } = await params;

  return (
    <main style={{ padding: 24 }}>
      <h1>Apply to Tournament</h1>
      <ApplyTeamForm tournamentId={id} />
    </main>
  );
}
