import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const errorCode = url.searchParams.get("error_code");

  // Supabase가 에러(만료된 링크 등)를 직접 콜백으로 전달하는 경우
  if (errorCode) {
    // next=/reset-password면 forgot-password로, 그 외엔 login으로
    const isResetFlow = next === "/reset-password";
    const errorUrl = new URL(isResetFlow ? "/forgot-password" : "/login", url.origin);
    errorUrl.searchParams.set("error", "link_expired");
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL("/login", url.origin);
    errorUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/login", url.origin);
    errorUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  const redirectTo = next ?? "/dashboard";
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
