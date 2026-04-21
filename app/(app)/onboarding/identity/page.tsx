import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { getMyPlayerProfile } from "@/lib/api/player-profile";
import IdentityForm from "./IdentityForm";
import OnboardingStepIndicator from "@/components/onboarding/OnboardingStepIndicator";

export const dynamic = "force-dynamic";

export default async function OnboardingIdentityPage() {
  const result = await getUserWithRole();

  // 비로그인 → 로그인
  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "empty") redirect("/login");

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </main>
    );
  }

  // 이미 player → 대시보드 (중복 접근 차단, 멱등)
  if (isPlayerRole(result.role)) redirect("/dashboard");

  // user가 아닌 경우(organizer, manager 등) → 홈
  if (!isUserRole(result.role)) redirect("/");

  // 선수 프로필 미완료 → 프로필 입력
  const playerProfileResult = await getMyPlayerProfile();
  if (!playerProfileResult.data) {
    redirect("/onboarding/profile");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <OnboardingStepIndicator currentStep="player" />

        <header className="mt-4 space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            선수 등록 — 본인인증
          </h1>
          <p className="text-sm text-slate-500">
            본인인증을 완료하면 선수로 등록됩니다.
          </p>
        </header>

        <IdentityForm />
      </div>
    </main>
  );
}
