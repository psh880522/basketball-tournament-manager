import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

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
