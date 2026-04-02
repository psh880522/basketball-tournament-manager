"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function UserSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const current = searchParams.get("q") ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`/admin/users?${params.toString()}`);
    });
  };

  return (
    <input
      type="search"
      defaultValue={current}
      onChange={handleChange}
      placeholder="이메일로 검색..."
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
    />
  );
}
