import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getMyProfile } from "@/lib/api/profiles";
import ProfileForm from "./Form";

export const dynamic = "force-dynamic";

export default async function OnboardingProfilePage() {
  // 1. 인증 가드
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");
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

  // 2. 프로필 초기값 로드
  const profileResult = await getMyProfile();
  const initialValues = profileResult.data ?? null;

  // 3. 렌더링
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="space-y-1">
          <p className="text-xs text-slate-400">1단계 / 2단계 — 본인인증은 추후 지원 예정</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            선수 등록 — 기본 정보 입력
          </h1>
          <p className="text-sm text-slate-500">
            이름과 연락처를 입력하세요.
          </p>
          <p className="text-sm text-slate-500">
            입력 완료 후 본인인증을 거쳐 선수로 등록됩니다.
          </p>
        </header>

        <ProfileForm initialValues={initialValues} />
      </div>
    </main>
  );
}
