"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createTeamAction } from "./actions";

export default function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedRegion = region.trim();

    if (!trimmedName) {
      setError("팀명을 입력해주세요.");
      return;
    }
    if (!trimmedRegion) {
      setError("활동 지역을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createTeamAction({
      name: trimmedName,
      region: trimmedRegion,
      bio: bio.trim() || undefined,
      contact: contact.trim() || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 필수 항목 */}

      <div className="flex flex-col gap-1">
        <label htmlFor="region" className="text-sm font-medium text-slate-700">
          팀명 <span className="text-red-500">*</span>
        </label>
        <Input
          id="team-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="팀명을 입력하세요"
          disabled={loading}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="region" className="text-sm font-medium text-slate-700">
          활동 지역 <span className="text-red-500">*</span>
        </label>
        <Input
          id="team-region"
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="예: 서울, 경기"
          disabled={loading}
          required
        />
      </div>
      

      {/* 선택 항목 */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="team-bio"
          className="text-sm font-medium text-gray-700"
        >
          팀 소개 <span className="text-xs text-gray-400">(선택)</span>
        </label>
        <textarea
          id="team-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="팀에 대한 소개를 입력하세요"
          disabled={loading}
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100 resize-none"
        />
      </div>

      <Input
        id="team-contact"
        label="연락처"
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="전화번호 또는 이메일 (선택)"
        disabled={loading}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "생성 중…" : "팀 생성"}
      </Button>
    </form>
  );
}
