"use client";

import { useMemo, useState, useTransition } from "react";
import { submitMatchResult } from "./actions";

type MatchRow = {
  id: string;
  division_id: string;
  group_id: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  divisions: { name: string } | null;
  groups: { name: string; order: number } | null;
  team_a: { team_name: string } | null;
  team_b: { team_name: string } | null;
};

type Message = {
  tone: "success" | "error";
  text: string;
};

type Props = {
  matches: MatchRow[];
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

export default function MatchResultForm({ matches }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message | null>>({});
  const [isPending, startTransition] = useTransition();
  const [draftByMatch, setDraftByMatch] = useState<
    Record<string, { scoreA: string; scoreB: string }>
  >(() => {
    const initial: Record<string, { scoreA: string; scoreB: string }> = {};
    matches.forEach((match) => {
      initial[match.id] = {
        scoreA: match.score_a?.toString() ?? "",
        scoreB: match.score_b?.toString() ?? "",
      };
    });
    return initial;
  });

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

  const handleScoreChange = (
    matchId: string,
    field: "scoreA" | "scoreB",
    value: string
  ) => {
    setDraftByMatch((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleSave = (matchId: string) => {
    setPendingId(matchId);
    setMessages((prev) => ({ ...prev, [matchId]: null }));

    startTransition(async () => {
      const draft = draftByMatch[matchId];
      const result = await submitMatchResult({
        matchId,
        scoreA: draft?.scoreA ?? "",
        scoreB: draft?.scoreB ?? "",
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
    return <p>입력할 경기가 없습니다.</p>;
  }

  const hasEditableMatch = matches.some((match) => match.status === "scheduled");

  return (
    <div style={{ marginTop: 16 }}>
      {!hasEditableMatch ? <p>입력할 경기가 없습니다.</p> : null}
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
                  const draft = draftByMatch[match.id] ?? {
                    scoreA: "",
                    scoreB: "",
                  };
                  const message = messages[match.id];
                  const isRowPending = isPending && pendingId === match.id;
                  const isCompleted = match.status === "completed";

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
                        <span>Status: {match.status}</span>
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          value={draft.scoreA}
                          onChange={(event) =>
                            handleScoreChange(match.id, "scoreA", event.target.value)
                          }
                          disabled={isCompleted}
                          style={{ width: 80 }}
                        />
                        <span>:</span>
                        <input
                          type="number"
                          min={0}
                          value={draft.scoreB}
                          onChange={(event) =>
                            handleScoreChange(match.id, "scoreB", event.target.value)
                          }
                          disabled={isCompleted}
                          style={{ width: 80 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(match.id)}
                          disabled={isRowPending || isCompleted}
                        >
                          {isRowPending ? "Saving..." : "결과 저장"}
                        </button>
                      </div>
                      {isCompleted ? (
                        <p style={{ marginTop: 8 }}>Final score saved.</p>
                      ) : null}
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
