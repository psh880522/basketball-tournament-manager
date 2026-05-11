import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTournamentForEdit } from "@/lib/api/tournaments";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getCourtsByTournament } from "@/lib/api/courts";
import { getDivisionApplicationCounts } from "@/lib/api/applications";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TournamentEditForm from "./Form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentEditPage({ params }: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">대회 수정</h1>
          <Card className="text-sm text-red-600">
            {userResult.error ?? "사용자 정보를 불러오지 못했습니다."}
          </Card>
        </div>
      </main>
    );
  }

  if (userResult.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">대회 수정</h1>
          <Card className="text-sm text-gray-600">
            프로필이 없습니다.
          </Card>
        </div>
      </main>
    );
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;
  const [
    { data, error },
    { data: divisions },
    { data: courts },
    { data: applicationCounts },
  ] = await Promise.all([
    getTournamentForEdit(id),
    getDivisionsByTournament(id),
    getCourtsByTournament(id),
    getDivisionApplicationCounts(id),
  ]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">대회 수정</h1>
          <Card className="text-sm text-red-600">
            대회 정보를 불러오지 못했습니다: {error}
          </Card>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">대회 수정</h1>
          <Card className="text-sm text-gray-600">
            대회 정보를 찾을 수 없습니다.
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">대회 수정</h1>
            <p className="text-sm text-gray-600">
              대회 정보를 수정하고 저장하세요.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">목록으로</Button>
          </Link>
        </header>

        <TournamentEditForm
          tournament={data}
          divisions={divisions ?? []}
          courts={courts ?? []}
          applicationCounts={applicationCounts ?? []}
        />
      </div>
    </main>
  );
}
