"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

type Props = {
  tournamentId: string;
  divisions: { id: string; name: string }[];
  courts: { id: string; name: string }[];
  current: { divisionId?: string; courtId?: string };
};

export default function ResultFilters({
  tournamentId,
  divisions,
  courts,
  current,
}: Props) {
  const router = useRouter();

  const navigate = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams();
      const next = { ...current, [key]: value };
      if (next.divisionId) p.set("divisionId", next.divisionId);
      if (next.courtId) p.set("courtId", next.courtId);
      const qs = p.toString();
      router.push(
        `/admin/tournaments/${tournamentId}/result${qs ? `?${qs}` : ""}`
      );
    },
    [router, tournamentId, current]
  );

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <select
        value={current.divisionId ?? ""}
        onChange={(e) => navigate("divisionId", e.target.value)}
        className="rounded border px-3 py-1.5 text-sm"
      >
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        value={current.courtId ?? ""}
        onChange={(e) => navigate("courtId", e.target.value)}
        className="rounded border px-3 py-1.5 text-sm"
      >
        <option value="">전체 코트</option>
        {courts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
