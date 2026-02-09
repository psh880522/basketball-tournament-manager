import Link from "next/link";
import { Suspense } from "react";
import { getPublicTournaments } from "@/src/lib/supabase/server";

async function TournamentsList() {
  const { data, error } = await getPublicTournaments();

  if (error) {
    return <p style={{ color: "crimson" }}>Failed to load: {error}</p>;
  }

  if (!data || data.length === 0) {
    return <p>No tournaments available.</p>;
  }

  return (
    <ul style={{ marginTop: 16 }}>
      {data.map((tournament) => (
        <li key={tournament.id} style={{ marginBottom: 12 }}>
          <Link href={`/tournament/${tournament.id}`}>{tournament.name}</Link>
          <div>
            {tournament.start_date || "TBD"} - {tournament.end_date || "TBD"}
          </div>
          <div>{tournament.location || "TBD"}</div>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Tournaments</h1>
      <Suspense fallback={<p>Loading tournaments...</p>}>
        <TournamentsList />
      </Suspense>
    </main>
  );
}
