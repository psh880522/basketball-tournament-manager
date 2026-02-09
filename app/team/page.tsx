import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";

export default async function TeamPage() {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") redirect("/login");

  if (result.status === "error") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Team Manager</h1>
        <p>Failed to load profile: {result.error}</p>
      </main>
    );
  }

  if (result.status === "empty") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Team Manager</h1>
        <p>No profile found for this account.</p>
      </main>
    );
  }

  if (result.role !== "organizer" && result.role !== "team_manager") {
    redirect("/dashboard");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Team Manager</h1>
    </main>
  );
}
