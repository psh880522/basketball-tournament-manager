import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublicTournamentById } from "@/src/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function TournamentDetail({ id }: { id: string }) {
  const { data, error } = await getPublicTournamentById(id);

  if (error) {
    return <p style={{ color: "crimson" }}>Failed to load: {error}</p>;
  }

  if (!data) {
    notFound();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>{data.name}</h1>
      <p>
        {data.start_date || "TBD"} - {data.end_date || "TBD"}
      </p>
      <p>{data.location || "TBD"}</p>
      <p>Status: {data.status}</p>
    </main>
  );
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<p>Loading tournament...</p>}>
      <TournamentDetail id={id} />
    </Suspense>
  );
}
