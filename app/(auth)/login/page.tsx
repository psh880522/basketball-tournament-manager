import Link from "next/link";
import Card from "@/components/ui/Card";
import LoginForm from "./Form";

function translateOAuthError(error: string): string {
  const map: Record<string, string> = {
    link_expired:         "링크가 만료되었습니다. 다시 로그인해주세요.",
    missing_code:         "인증 코드가 없습니다. 다시 시도해주세요.",
    oauth_cancelled:      "로그인이 취소되었습니다.",
    oauth_provider_error: "소셜 로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
    email_conflict:       "동일한 이메일로 이미 가입된 계정이 있습니다. 이메일 로그인을 이용하세요.",
    session_error:        "세션 복구에 실패했습니다. 다시 로그인해주세요.",
  };
  return map[error] ?? "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
}

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const initialError = error ? translateOAuthError(error) : undefined;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="h-9" />
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
          <p className="text-sm text-slate-500">소셜 계정 또는 이메일로 로그인하세요.</p>
        </div>

        <Card>
          <LoginForm initialError={initialError} />
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
