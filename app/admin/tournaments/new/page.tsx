import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import NewTournamentForm from "./Form";

export default async function NewTournamentPage() {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  return (
    <main style={{ padding: 24 }}>
      <h1>Create Tournament</h1>
      <NewTournamentForm />
    </main>
  );
}
