"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { forgotPasswordAction } from "./actions";

type Message = {
  tone: "error" | "success";
  text: string;
};

const MailIcon = () => (
  <svg
    className="h-10 w-10 text-amber-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await forgotPasswordAction({ email });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setEmailSent(true);
    });
  };

  if (emailSent) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="flex justify-center">
          <MailIcon />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">
            메일을 발송했습니다
          </h2>
          <p className="text-sm text-slate-500">
            이메일이 존재한다면{" "}
            <span className="font-medium text-slate-700">{email}</span>
            으로
            <br />
            재설정 링크가 발송됩니다.
          </p>
          <p className="text-xs text-slate-400">
            메일이 오지 않는다면 스팸 폴더를 확인해주세요.
          </p>
        </div>
        <Link href="/login">
          <Button variant="secondary" className="w-full">
            로그인 페이지로 이동
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message?.tone === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{message.text}</p>
        </div>
      )}

      <Input
        id="email"
        label="이메일"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="가입하신 이메일을 입력하세요"
        required
        autoComplete="email"
        disabled={isPending}
      />

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "발송 중..." : "재설정 링크 발송"}
      </Button>
    </form>
  );
}
