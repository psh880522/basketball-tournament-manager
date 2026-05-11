"use client";

import { useState, useTransition } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { resetPasswordAction } from "./actions";

type Message = {
  tone: "error" | "success";
  text: string;
};

const EyeIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ tone: "error", text: "비밀번호는 6자 이상이어야 합니다." });
      return;
    }

    if (password !== passwordConfirm) {
      setMessage({ tone: "error", text: "비밀번호가 일치하지 않습니다." });
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction({ password });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
      }
      // 성공 시 server action에서 redirect("/dashboard") 처리됨
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message?.tone === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{message.text}</p>
        </div>
      )}

      <Input
        id="password"
        label="새 비밀번호"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="새 비밀번호를 입력하세요"
        required
        autoComplete="new-password"
        disabled={isPending}
        hint="6자 이상 입력하세요."
        className="pr-10"
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-slate-400 hover:text-slate-600"
            tabIndex={-1}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      <Input
        id="passwordConfirm"
        label="새 비밀번호 확인"
        type={showPasswordConfirm ? "text" : "password"}
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        placeholder="새 비밀번호를 다시 입력하세요"
        required
        autoComplete="new-password"
        disabled={isPending}
        className="pr-10"
        rightElement={
          <button
            type="button"
            onClick={() => setShowPasswordConfirm((prev) => !prev)}
            className="text-slate-400 hover:text-slate-600"
            tabIndex={-1}
            aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 표시"}
          >
            {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  );
}
