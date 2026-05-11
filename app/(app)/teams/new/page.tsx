import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import CreateTeamForm from "./Form";

export const dynamic = "force-dynamic";

export default async function TeamsNewPage() {
  const result = await getUserWithRole();

  if (result.status === "empty") {
    redirect("/login");
  }

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </main>
    );
  }

  // 선수 등록 미완료
  if (isUserRole(result.role)) redirect("/onboarding/profile");
  // 운영 역할
  if (!isPlayerRole(result.role)) redirect("/");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">팀 만들기</h1>
          <p className="text-sm text-slate-500">
            새로운 팀을 만들어 선수들을 모집하세요.
          </p>
        </header>

        <Card>
          <CreateTeamForm />
        </Card>
      </div>
    </main>
  );
}
