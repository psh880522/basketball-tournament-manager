import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResultsPage({ params }: PageProps) {
  const { id: tournamentId } = await params;
  redirect(`/admin/tournaments/${tournamentId}/result`);
}
