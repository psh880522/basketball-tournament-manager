"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { saveTermsConsentAction } from "./actions";

type TermsConsentFormProps = {
  next: string;
};

export default function TermsConsentForm({ next }: TermsConsentFormProps) {
  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const agreeAll = agreeService && agreePrivacy && agreeMarketing;

  function handleAgreeAll() {
    const next = !agreeAll;
    setAgreeService(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveTermsConsentAction({
        agreeService,
        agreePrivacy,
        agreeMarketing,
        next,
      });

      if (!result.ok) {
        setError(result.error);
      }
      // 성공 시 server action 내부에서 redirect() 처리됨
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        {/* 전체 동의 */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={agreeAll}
            onChange={handleAgreeAll}
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-sm font-semibold text-slate-800">전체 동의</span>
        </label>

        <hr className="border-slate-200" />

        {/* 서비스 이용약관 (필수) */}
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeService}
              onChange={(e) => setAgreeService(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-amber-600">[필수]</span> 서비스 이용약관 동의
            </span>
          </div>
          <Link href="/policy/service" target="_blank" className="shrink-0 text-xs text-slate-400 underline hover:text-slate-600">전문 보기</Link>
        </label>

        {/* 개인정보처리방침 (필수) */}
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-amber-600">[필수]</span> 개인정보처리방침 동의
            </span>
          </div>
          <Link href="/policy/privacy" target="_blank" className="shrink-0 text-xs text-slate-400 underline hover:text-slate-600">전문 보기</Link>
        </label>

        {/* 마케팅 동의 (선택) */}
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeMarketing}
              onChange={(e) => setAgreeMarketing(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="text-sm text-slate-700">
              <span className="text-slate-400">[선택]</span> 마케팅 정보 수신 동의
            </span>
          </div>
          <Link href="/policy/marketing" target="_blank" className="shrink-0 text-xs text-slate-400 underline hover:text-slate-600">전문 보기</Link>
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "저장 중..." : "동의하고 시작하기"}
      </Button>
    </form>
  );
}
