"use client";

import { useMemo, useState, useTransition } from "react";
import { assignCourtToMatch } from "./actions";

type Court = {
  id: string;
  name: string;
};

type MatchRow = {
  id: string;
  division_id: string;
  group_id: string | null;
  court_id: string | null;
  status: string;
  divisions: { name: string } | null;
  groups: { name: string; order: number } | null;
  team_a: { team_name: string } | null;
  team_b: { team_name: string } | null;
  court: { id: string; name: string } | null;
};

type Message = {
  tone: "success" | "error";
  text: string;
};

type Props = {
  matches: MatchRow[];
  courts: Court[];
};

type GroupBlock = {
  id: string;
  name: string;
  order: number;
  matches: MatchRow[];
};

type DivisionBlock = {
  id: string;
  name: string;
  groups: GroupBlock[];
};

export default function MatchCourtForm({ matches, courts }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message | null>>({});
  const [isPending, startTransition] = useTransition();
  const [selectionByMatch, setSelectionByMatch] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      matches.forEach((match) => {
        initial[match.id] = match.court_id ?? "";
      });
      return initial;
    }
  );

  const divisions = useMemo<DivisionBlock[]>(() => {
    const divisionMap: Record<string, DivisionBlock> = {};

    matches.forEach((match) => {
      const divisionId = match.division_id;
      const divisionName = match.divisions?.name ?? "Division";
      if (!divisionMap[divisionId]) {
        divisionMap[divisionId] = { id: divisionId, name: divisionName, groups: [] };
      }

      const groupId = match.group_id ?? "ungrouped";
      const groupName = match.groups?.name ?? "Ungrouped";
      const groupOrder = match.groups?.order ?? 0;
      const division = divisionMap[divisionId];
      let group = division.groups.find((item) => item.id === groupId);
      if (!group) {
        group = { id: groupId, name: groupName, order: groupOrder, matches: [] };
        division.groups.push(group);
      }
      group.matches.push(match);
    });

    return Object.values(divisionMap)
      .map((division) => ({
        ...division,
        groups: [...division.groups].sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.name.localeCompare(b.name);
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const handleSelectChange = (matchId: string, value: string) => {
    setSelectionByMatch((prev) => ({ ...prev, [matchId]: value }));
  };

  const handleSave = (matchId: string) => {
    setPendingId(matchId);
    setMessages((prev) => ({ ...prev, [matchId]: null }));

    startTransition(async () => {
      const selected = selectionByMatch[matchId] ?? "";
      const result = await assignCourtToMatch({
        matchId,
        courtId: selected ? selected : null,
      });

      setMessages((prev) => ({
        ...prev,
        [matchId]: result.ok
          ? { tone: "success", text: "Saved." }
          : { tone: "error", text: result.error },
      }));

      setPendingId(null);
    });
  };

  if (matches.length === 0) {
    return <p>아직 생성된 경기가 없습니다.</p>;
  }

  return (
    <div style={{ marginTop: 16 }}>
      {divisions.map((division) => (
        <section key={division.id} style={{ marginBottom: 24 }}>
          <h2>{division.name}</h2>
          {division.groups.map((group) => (
            <div key={group.id} style={{ marginTop: 16 }}>
              <h3>{group.name}</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {group.matches.map((match) => {
                  const teamA = match.team_a?.team_name ?? "TBD";
                  const teamB = match.team_b?.team_name ?? "TBD";
                  const selected = selectionByMatch[match.id] ?? "";
                  const message = messages[match.id];
                  const isRowPending = isPending && pendingId === match.id;

                  return (
                    <div
                      key={match.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>
                          {teamA} vs {teamB}
                        </strong>
                        <span>
                          Current: {match.court?.name ?? "Unassigned"}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <select
                          value={selected}
                          onChange={(event) =>
                            handleSelectChange(match.id, event.target.value)
                          }
                        >
                          <option value="">Unassigned</option>
                          {courts.map((court) => (
                            <option key={court.id} value={court.id}>
                              {court.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSave(match.id)}
                          disabled={isRowPending}
                        >
                          {isRowPending ? "Saving..." : "Save"}
                        </button>
                      </div>
                      {message ? (
                        <p
                          style={{
                            marginTop: 8,
                            color: message.tone === "error" ? "crimson" : "green",
                          }}
                        >
                          {message.text}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
