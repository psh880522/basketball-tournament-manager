import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { getUserTeamStatus } from "@/lib/api/team-applications";
import OnboardingStepIndicator from "@/components/onboarding/OnboardingStepIndicator";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function TeamChoicePage() {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated" || result.status === "empty") {
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

  // 선수 등록 미완료 → 프로필 입력
  if (isUserRole(result.role)) redirect("/onboarding/profile");

  // 운영/관리 역할 → 홈
  if (!isPlayerRole(result.role)) redirect("/");

  // 이미 팀 멤버/캡틴이면 대시보드
  const statusResult = await getUserTeamStatus(result.user!.id);
  if (
    statusResult.data === "team_member" ||
    statusResult.data === "captain"
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <OnboardingStepIndicator currentStep="team" />

        <header className="mt-4 space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">팀을 선택하세요</h1>
          <p className="text-sm text-slate-500">
            팀을 만들거나, 기존 팀에 합류 신청을 할 수 있습니다.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <Link href="/teams/new">
            <Button className="w-full">팀 만들기</Button>
          </Link>
          <Link href="/teams/find">
            <Button variant="secondary" className="w-full">팀 찾기</Button>
          </Link>
          <Link
            href="/dashboard"
            className="text-center text-sm text-slate-500 hover:text-slate-700"
          >
            나중에 하기
          </Link>
        </div>
      </div>
    </main>
  );
}
