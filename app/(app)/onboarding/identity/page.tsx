import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import IdentityForm from "./IdentityForm";

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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="space-y-1">
          <p className="text-xs text-slate-400">2단계 / 2단계</p>
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
