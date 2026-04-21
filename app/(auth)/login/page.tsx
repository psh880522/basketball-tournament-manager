import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole, isPlayerRole } from "@/src/lib/auth/roles";
import Card from "@/components/ui/Card";
import LoginForm from "./Form";

export default async function LoginPage() {
  const result = await getUserWithRole();
  if (result.status === "ready") {
    if (isOperationRole(result.role)) redirect("/admin");
    if (isPlayerRole(result.role)) redirect("/dashboard");
    redirect("/");
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="h-9" />
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
          <p className="text-sm text-slate-500">이메일과 비밀번호로 로그인하세요.</p>
        </div>

        <Card>
          <LoginForm />
        </Card>

        <p className="text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-amber-600 hover:text-amber-500"
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
