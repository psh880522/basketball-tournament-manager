import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getMyTeamsWithTournament } from "@/lib/api/teams";

async function TeamContent() {
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

  const userId = result.user?.id;

  if (!userId) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Team Manager</h1>
        <p>Missing user identity.</p>
      </main>
    );
  }

  const { data, error } = await getMyTeamsWithTournament(userId);

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Team Manager</h1>
        <p style={{ color: "crimson" }}>Failed to load teams: {error}</p>
      </main>
    );
  }

  if (!data || data.length === 0) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Team Manager</h1>
        <p>신청한 팀이 없습니다.</p>
        <Link href="/">대회 목록 보기</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Team Manager</h1>
      <ul style={{ marginTop: 16 }}>
        {data.map((team) => (
          <li key={team.id} style={{ marginBottom: 12 }}>
            <strong>{team.team_name}</strong>
            <div>Contact: {team.contact}</div>
            <div>Status: {team.status}</div>
            <div>
              Tournament: {team.tournaments?.name ?? "Unknown"}
            </div>
            <div>Status: {team.tournaments?.status ?? "unknown"}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<p>Loading team info...</p>}>
      <TeamContent />
    </Suspense>
  );
}
