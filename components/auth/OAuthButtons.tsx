"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { OAuthProvider } from "@/lib/types/auth";

type OAuthButtonsProps = {
  mode: "login" | "signup";
};

const labelMap: Record<OAuthProvider, Record<"login" | "signup", string>> = {
  google: { login: "Google로 계속하기",  signup: "Google로 시작하기"  },
  kakao:  { login: "카카오로 계속하기", signup: "카카오로 시작하기" },
};

const loadingLabelMap: Record<OAuthProvider, string> = {
  google: "Google로 이동 중...",
  kakao:  "카카오로 이동 중...",
};

const GoogleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

const KakaoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 1C4.582 1 1 3.806 1 7.273c0 2.22 1.456 4.168 3.644 5.284l-.928 3.458c-.082.305.273.547.528.365L8.42 13.76c.19.018.382.028.58.028 4.418 0 8-2.806 8-6.273C17 4.048 13.418 1 9 1z"
      fill="currentColor"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="animate-spin h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export default function OAuthButtons({ mode }: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOAuthLogin(provider: OAuthProvider) {
    setError(null);
    setPendingProvider(provider);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    const redirectTo = `${siteUrl}/auth/callback`;

    const supabase = createSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (oauthError) {
      setError("소셜 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setPendingProvider(null);
    }
    // 성공 시 브라우저가 provider 페이지로 리다이렉트 → React state 소멸
  }

  const isAnyPending = pendingProvider !== null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Google 버튼 */}
      <button
        type="button"
        onClick={() => handleOAuthLogin("google")}
        disabled={isAnyPending}
        aria-busy={pendingProvider === "google"}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pendingProvider === "google" ? <SpinnerIcon /> : <GoogleIcon />}
        {pendingProvider === "google"
          ? loadingLabelMap.google
          : labelMap.google[mode]}
      </button>

      {/* 카카오 버튼 — 권한 심사 완료 전 임시 비활성화 */}
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#000000]/40 cursor-not-allowed opacity-50"
      >
        <span className="text-[#000000]/40">
          <KakaoIcon />
        </span>
        {labelMap.kakao[mode]} (준비 중)
      </button>
    </div>
  );
}
