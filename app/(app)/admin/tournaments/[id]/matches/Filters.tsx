"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

type Props = {
  tournamentId: string;
  divisions: { id: string; name: string }[];
  courts: { id: string; name: string }[];
  current: { division?: string; court?: string };
};

export default function MatchFilters({
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
      if (next.division) p.set("division", next.division);
      if (next.court) p.set("court", next.court);
      const qs = p.toString();
      router.push(
        `/admin/tournaments/${tournamentId}/matches${qs ? `?${qs}` : ""}`
      );
    },
    [router, tournamentId, current]
  );

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <select
        value={current.division ?? ""}
        onChange={(e) => navigate("division", e.target.value)}
        className="rounded border px-3 py-1.5 text-sm"
      >
        <option value="">전체 디비전</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        value={current.court ?? ""}
        onChange={(e) => navigate("court", e.target.value)}
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
