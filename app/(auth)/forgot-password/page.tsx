import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import ForgotPasswordForm from "./Form";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

function resolveError(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "link_expired") {
    return "재설정 링크가 만료되었거나 유효하지 않습니다. 이메일을 다시 입력해주세요.";
  }
  return null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const result = await getUserWithRole();

  if (result.status === "ready") {
    redirect(isOperationRole(result.role) ? "/admin" : "/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolveError(resolvedSearchParams?.error);

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">비밀번호 찾기</h1>
          <p className="text-sm text-slate-500">
            가입하신 이메일로 재설정 링크를 보내드립니다.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <Card>
          <ForgotPasswordForm />
        </Card>

        <p className="text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-amber-600 hover:text-amber-500"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}
