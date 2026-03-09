import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listDivisionsWithStats } from "@/lib/api/divisions";
import BracketConsoleForm from "./Form";

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
  const result = await listDivisionsWithStats(id);

  if (result.error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const divisions = result.data ?? [];
  const totalApproved = divisions.reduce((s, d) => s + d.approvedCount, 0);
  const totalMatches = divisions.reduce((s, d) => s + d.matchCount, 0);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">조/경기 생성 콘솔</h1>
      <p className="mb-6 text-sm text-gray-500">
        디비전 {divisions.length}개 · 승인 팀 {totalApproved} · 경기{" "}
        {totalMatches}
      </p>

      {divisions.length === 0 ? (
        <p className="text-gray-500">등록된 디비전이 없습니다.</p>
      ) : (
        <BracketConsoleForm tournamentId={id} divisions={divisions} />
      )}
    </main>
  );
}
