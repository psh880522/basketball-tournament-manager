import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole, isOperationRole } from "@/src/lib/auth/roles";
import { getMyProfile } from "@/lib/api/profiles";
import { getMyPlayerProfile } from "@/lib/api/player-profile";
import ProfileForm from "./Form";
import OnboardingStepIndicator from "@/components/onboarding/OnboardingStepIndicator";

export const dynamic = "force-dynamic";

export default async function OnboardingProfilePage() {
  // 1. 인증 가드
  const userResult = await getUserWithRole();

  if (userResult.status === "empty") redirect("/login");

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-red-600">{userResult.error}</p>
        </div>
      </main>
    );
  }

  // 이미 player인 경우 온보딩 재진입 차단
  if (isPlayerRole(userResult.role)) redirect("/dashboard");

  // 운영 역할(organizer/manager)은 온보딩 대상 아님
  if (isOperationRole(userResult.role)) redirect("/");

  // 2. 초기값 병렬 로드
  const [profileResult, playerProfileResult] = await Promise.all([
    getMyProfile(),
    getMyPlayerProfile(),
  ]);

  // 3. 렌더링
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <OnboardingStepIndicator currentStep="player" />

        <header className="mt-4 space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            기본 정보 입력
          </h1>
          <p className="text-sm text-slate-500">
            닉네임과 선수 정보를 입력하세요.
          </p>
          <p className="text-sm text-slate-500">
            입력 완료 후 본인인증을 거쳐 선수로 등록됩니다.
          </p>
        </header>

        <ProfileForm
          initialProfile={profileResult.data ?? null}
          initialPlayerProfile={playerProfileResult.data ?? null}
        />
      </div>
    </main>
  );
}
