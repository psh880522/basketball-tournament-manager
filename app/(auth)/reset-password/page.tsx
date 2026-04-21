import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import Card from "@/components/ui/Card";
import ResetPasswordForm from "./Form";

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // 세션 없음 → 만료된 링크 또는 직접 접근
  if (!session) {
    redirect("/forgot-password?error=link_expired");
  }

  // JWT payload를 직접 디코딩해 AMR의 recovery 여부 확인
  // session.amr은 타입에 없으므로 access_token에서 직접 읽음
  function decodeJwtPayload(token: string): Record<string, unknown> {
    try {
      const [, payload] = token.split(".");
      return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  const jwtPayload = decodeJwtPayload(session.access_token);
  const amr = Array.isArray(jwtPayload.amr) ? (jwtPayload.amr as unknown[]) : [];
  const isRecovery = amr.some((entry) => {
    if (typeof entry === "string") return entry === "recovery";
    if (typeof entry === "object" && entry !== null && "method" in entry) {
      return (entry as { method: string }).method === "recovery";
    }
    return false;
  });

  if (!isRecovery) {
    // 일반 로그인 사용자 → 적절한 페이지로 redirect
    const result = await getUserWithRole();
    redirect(isOperationRole(result.role) ? "/admin" : "/dashboard");
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="h-9" />
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">새 비밀번호 설정</h1>
          <p className="text-sm text-slate-500">
            새로 사용할 비밀번호를 입력해주세요.
          </p>
        </div>

        <Card>
          <ResetPasswordForm />
        </Card>
      </div>
    </main>
  );
}
