import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getOrganizerTournaments } from "@/src/lib/supabase/server";

async function AdminTournamentsContent() {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const organizerId = userResult.user?.id;

  if (!organizerId) {
    return <p>Missing organizer identity.</p>;
  }

  const { data, error } = await getOrganizerTournaments(organizerId);

  if (error) {
    return <p style={{ color: "crimson" }}>Failed to load: {error}</p>;
  }

  if (!data || data.length === 0) {
    return <p>No tournaments found.</p>;
  }

  return (
    <ul style={{ marginTop: 16 }}>
      {data.map((tournament) => (
        <li key={tournament.id} style={{ marginBottom: 8 }}>
          <strong>{tournament.name}</strong> ({tournament.status})
        </li>
      ))}
    </ul>
  );
}

export default function AdminTournamentsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Tournaments</h1>
      <p>
        <Link href="/admin/tournaments/new">Create new tournament</Link>
      </p>
      <Suspense fallback={<p>Loading tournaments...</p>}>
        <AdminTournamentsContent />
      </Suspense>
    </main>
  );
}
