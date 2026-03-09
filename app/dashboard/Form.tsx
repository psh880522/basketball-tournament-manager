"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createTeamAction } from "./actions";

export default function CreateTeamForm({
  onCancel,
}: {
  onCancel: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("팀명을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createTeamAction({
      name: trimmed,
      contact: contact.trim() || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="team-name" className="block text-sm font-medium text-gray-700">
          팀명 <span className="text-red-500">*</span>
        </label>
        <input
          id="team-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="팀명을 입력하세요"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="team-contact" className="block text-sm font-medium text-gray-700">
          연락처 <span className="text-xs text-gray-400">(선택)</span>
        </label>
        <input
          id="team-contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="전화번호 또는 이메일"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          disabled={loading}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "생성 중…" : "팀 생성"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          취소
        </Button>
      </div>
    </form>
  );
}
