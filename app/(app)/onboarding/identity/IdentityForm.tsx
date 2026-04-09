"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import { verifyIdentityAndPromote } from "./actions";

export default function IdentityForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToastClose = useCallback(() => {
    setToastMessage(null);
  }, []);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("실명을 입력해주세요.");
      return;
    }
    setErrorMessage(null);

    startTransition(async () => {
      const result = await verifyIdentityAndPromote({
        name: name.trim(),
        phone: phone.trim(),
        birthDate,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setIsSuccess(true);
      setToastMessage("본인인증 완료. 선수로 등록되었습니다.");
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1500);
    });
  }

  function handleCancel() {
    router.push("/");
  }

  return (
    <>
      <Card className="space-y-5">
        {isSuccess ? (
          <p className="text-sm text-emerald-600 font-medium">
            인증 완료. 대시보드로 이동합니다…
          </p>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
              현재 테스트 환경입니다. 실제 본인인증은 추후 지원됩니다.
            </p>

            <Input
              id="verified-name"
              label="실명"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
            />

            <Input
              id="verified-phone"
              label="휴대폰번호"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              disabled={isPending}
            />

            <Input
              id="verified-birth-date"
              label="생년월일"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={isPending}
            />

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "인증 중…" : "본인인증 시작"}
            </Button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              취소하고 나중에 하기
            </button>
          </form>
        )}
      </Card>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={handleToastClose}
        />
      )}
    </>
  );
}
