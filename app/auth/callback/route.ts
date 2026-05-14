import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { TERMS_VERSIONS } from "@/lib/constants/terms";

function translateCallbackError(message: string): string {
  const map: Record<string, string> = {
    link_expired: "link_expired",
    missing_code: "missing_code",
    oauth_cancelled: "oauth_cancelled",
    session_error: "session_error",
  };
  return map[message] ?? "oauth_provider_error";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const errorCode = url.searchParams.get("error_code");

  // Supabase가 에러(만료된 링크 등)를 직접 콜백으로 전달하는 경우
  if (errorCode) {
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

  // 단일 클라이언트 인스턴스 — 이후 모든 쿼리에 재사용
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/login", url.origin);
    errorUrl.searchParams.set("error", translateCallbackError(error.message));
    return NextResponse.redirect(errorUrl);
  }

  // next 파라미터가 있으면 이메일 확인 / 비밀번호 재설정 플로우 — 기존 동작 유지
  if (next) {
    const safeNext = next.startsWith("/") ? next : "/dashboard";
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  // next 파라미터 없음 → OAuth 플로우
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const errorUrl = new URL("/login", url.origin);
    errorUrl.searchParams.set("error", "session_error");
    return NextResponse.redirect(errorUrl);
  }

  // 신규 유저 판단: created_at 기준 10초 이내
  const isNewUser = (Date.now() - new Date(user.created_at).getTime()) < 10_000;

  if (isNewUser) {
    // 신규 OAuth 유저 — 약관 동의 자동 기록 (OAuth 동의 화면에서 동의한 것으로 처리)
    await supabase.from("user_terms_consents").insert([
      { user_id: user.id, terms_type: "service",   terms_version: TERMS_VERSIONS.service,   agreed: true  },
      { user_id: user.id, terms_type: "privacy",   terms_version: TERMS_VERSIONS.privacy,   agreed: true  },
      { user_id: user.id, terms_type: "marketing", terms_version: TERMS_VERSIONS.marketing, agreed: false },
    ]);
    // 에러 무시 — 실패해도 버전 체크에서 재동의 요청으로 자연스럽게 처리됨
  } else {
    // 기존 유저 — 약관 버전 체크 (재동의 필요 여부 확인)
    const { data: versionRows } = await supabase
      .from("user_terms_consents")
      .select("terms_type, terms_version, consented_at")
      .eq("user_id", user.id)
      .in("terms_type", ["service", "privacy"])
      .order("consented_at", { ascending: false });

    const latestVersionByType = new Map<string, string>();
    for (const row of (versionRows ?? []) as { terms_type: string; terms_version: string }[]) {
      if (!latestVersionByType.has(row.terms_type)) {
        latestVersionByType.set(row.terms_type, row.terms_version);
      }
    }

    const serviceOk = latestVersionByType.get("service") === TERMS_VERSIONS.service;
    const privacyOk = latestVersionByType.get("privacy") === TERMS_VERSIONS.privacy;

    if (!serviceOk || !privacyOk) {
      return NextResponse.redirect(
        new URL("/terms?next=/onboarding/completion?step=signup", url.origin)
      );
    }
  }

  // 역할 기반 리다이렉트
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role: string } | null)?.role;
  if (role === "organizer" || role === "manager") {
    return NextResponse.redirect(new URL("/admin", url.origin));
  }
  if (role === "player") {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/onboarding/completion?step=signup", url.origin));
}
