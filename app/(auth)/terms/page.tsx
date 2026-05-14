import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getMyTermsConsentStatus } from "@/lib/api/terms";
import TermsConsentForm from "./Form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function TermsPage({ searchParams }: Props) {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated" || result.status === "empty") {
    redirect("/login");
  }

  if (result.status === "error") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-sm">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </main>
    );
  }

  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : "/onboarding/completion?step=signup";

  // 이미 약관 동의한 유저는 바로 다음 경로로 이동
  const termsStatus = await getMyTermsConsentStatus();
  const hasRequiredTerms =
    termsStatus.data?.service === true && termsStatus.data?.privacy === true;

  if (hasRequiredTerms) {
    redirect(safeNext);
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">서비스 이용 동의</h1>
          <p className="text-sm text-slate-500">
            23Board를 이용하기 전 아래 약관에 동의해주세요.
          </p>
        </div>

        <Card>
          <TermsConsentForm next={safeNext} />
        </Card>
      </div>
    </main>
  );
}
