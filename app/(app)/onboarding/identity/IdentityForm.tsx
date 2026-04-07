"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { verifyIdentityAndPromote } from "./actions";

type VerifyStatus = "idle" | "pending" | "success" | "error";

export default function IdentityForm() {
  const router = useRouter();
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToastClose = useCallback(() => {
    setToastMessage(null);
  }, []);

  async function handleVerify() {
    setStatus("pending");
    setErrorMessage(null);

    // provider 연동 전: 빈 토큰으로 호출 (mock adapter가 처리)
    const result = await verifyIdentityAndPromote("");

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    setStatus("success");
    setToastMessage("본인인증이 완료되었습니다. 선수로 등록되었습니다.");
    // role이 player로 변경되었으므로 세션 갱신 후 대시보드 이동
    router.refresh();
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  function handleCancel() {
    router.push("/");
  }

  const isPending = status === "pending";
  const isSuccess = status === "success";

  return (
    <>
      <Card className="space-y-5">
        {status === "success" ? (
          <p className="text-sm text-emerald-600 font-medium">
            인증 완료. 대시보드로 이동합니다…
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              아래 버튼을 눌러 본인인증을 진행하세요.
            </p>

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button
              type="button"
              onClick={handleVerify}
              disabled={isPending || isSuccess}
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
          </div>
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
