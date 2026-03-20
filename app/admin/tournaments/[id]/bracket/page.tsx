import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getBracketGenerationSummary } from "@/lib/api/bracket";
import { BracketConsoleForm } from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BracketPage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return (
      <main className="p-6">
        <p className="text-red-600">{userResult.error}</p>
      </main>
    );
  }

  if (userResult.status === "empty") {
    return (
      <main className="p-6">
        <p className="text-gray-500">프로필 정보를 찾을 수 없습니다.</p>
      </main>
    );
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;
  const summaryResult = await getBracketGenerationSummary(id);

  if (summaryResult.error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{summaryResult.error}</p>
      </main>
    );
  }

  const summary = summaryResult.data;
  if (!summary) {
    return (
      <main className="p-6">
        <p className="text-gray-500">대회 정보를 불러올 수 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <BracketConsoleForm tournamentId={id} summary={summary} />
    </main>
  );
}
