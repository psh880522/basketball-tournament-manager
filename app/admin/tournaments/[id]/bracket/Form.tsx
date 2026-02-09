"use client";

import { useState, useTransition } from "react";
import { generateGroupStage } from "./actions";

type Division = {
  id: string;
  name: string;
  group_size: number;
};

type Message = {
  tone: "success" | "error";
  text: string;
};

type Props = {
  tournamentId: string;
  divisions: Division[];
};

export default function BracketGeneratorForm({ tournamentId, divisions }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message | null>>({});
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (divisionId: string) => {
    setPendingId(divisionId);
    setMessages((prev) => ({ ...prev, [divisionId]: null }));

    startTransition(async () => {
      const result = await generateGroupStage({
        tournamentId,
        divisionId,
      });

      setMessages((prev) => ({
        ...prev,
        [divisionId]: result.ok
          ? { tone: "success", text: "Generated." }
          : { tone: "error", text: result.error },
      }));

      setPendingId(null);
    });
  };

  return (
    <div style={{ marginTop: 16 }}>
      {divisions.map((division) => {
        const message = messages[division.id];
        const isRowPending = isPending && pendingId === division.id;

        return (
          <div
            key={division.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <strong>{division.name}</strong>
            <div>Group size: {division.group_size}</div>
            <button
              type="button"
              onClick={() => handleGenerate(division.id)}
              disabled={isRowPending}
              style={{ marginTop: 8 }}
            >
              {isRowPending ? "Generating..." : "Generate groups & matches"}
            </button>
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
  );
}
