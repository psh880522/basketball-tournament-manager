"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/src/lib/auth/roles";
import { updateUserRoleAction } from "./actions";

type Props = {
  userId: string;
  currentRole: Role;
};

export default function UserRoleForm({ userId, currentRole }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const targetRole = currentRole === "manager" ? "player" : "manager";
  const label = currentRole === "manager" ? "player로 강등" : "manager로 승격";

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction({
        targetUserId: userId,
        newRole: targetRole,
      });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
      >
        {isPending ? "처리 중..." : label}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
