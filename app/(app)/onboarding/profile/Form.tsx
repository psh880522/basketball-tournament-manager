"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import type { Profile } from "@/lib/api/profiles";
import { saveOnboardingProfile } from "./actions";

type Props = {
  initialValues: Profile | null;
};

export default function ProfileForm({ initialValues }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    initialValues?.display_name ?? ""
  );
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [birthDate, setBirthDate] = useState(
    initialValues?.birth_date ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToastClose = useCallback(() => {
    setToastMessage(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!displayName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!phone.trim()) {
      setError("연락처를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await saveOnboardingProfile({
      display_name: displayName,
      phone,
      birth_date: birthDate || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setToastMessage("기본 정보가 저장되었습니다. 본인인증 단계로 이동합니다.");
    setTimeout(() => router.push("/onboarding/identity"), 1500);
  }

  return (
    <>
      <Card className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="display-name"
            label="이름"
            type="text"
            placeholder="표시될 이름을 입력하세요"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            required
          />
          <Input
            id="phone"
            label="연락처"
            type="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            required
          />
          <Input
            id="birth-date"
            label="생년월일 (선택)"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            disabled={loading}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "저장 중…" : "저장하고 계속"}
          </Button>
        </form>
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
