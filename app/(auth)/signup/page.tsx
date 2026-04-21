import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import SignupForm from "./Form";
import OnboardingStepIndicator from "@/components/onboarding/OnboardingStepIndicator";

export default async function SignupPage() {
  const result = await getUserWithRole();

  if (result.status === "ready") {
    redirect(isOperationRole(result.role) ? "/admin" : "/dashboard");
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <OnboardingStepIndicator currentStep="signup" />

        <div className="mt-8 space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
          <p className="text-sm text-slate-500">이메일과 비밀번호로 계정을 만드세요.</p>
        </div>

        <Card>
          <SignupForm />
        </Card>

        <p className="text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-600 hover:text-amber-500"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
