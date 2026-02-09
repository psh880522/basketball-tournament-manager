"use client";

import { useState, useTransition } from "react";
import { createCourtAction, deleteCourtAction } from "./actions";

type Court = {
  id: string;
  name: string;
};

type Message = {
  tone: "success" | "error";
  text: string;
};

type Props = {
  tournamentId: string;
  courts: Court[];
};

export default function CourtsForm({ tournamentId, courts }: Props) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    setMessage(null);
    setPendingKey("create");

    startTransition(async () => {
      const result = await createCourtAction({ tournamentId, name });

      setMessage(
        result.ok
          ? { tone: "success", text: "Court created." }
          : { tone: "error", text: result.error }
      );

      if (result.ok) {
        setName("");
      }

      setPendingKey(null);
    });
  };

  const handleDelete = (courtId: string) => {
    setMessage(null);
    setPendingKey(courtId);

    startTransition(async () => {
      const result = await deleteCourtAction({ courtId });

      setMessage(
        result.ok
          ? { tone: "success", text: "Court deleted." }
          : { tone: "error", text: result.error }
      );

      setPendingKey(null);
    });
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="courtName">Court name</label>
        <input
          id="courtName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="A Court"
          style={{ display: "block", marginTop: 8, marginBottom: 12 }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending && pendingKey === "create"}
        >
          {isPending && pendingKey === "create" ? "Saving..." : "Add court"}
        </button>
      </div>

      {message ? (
        <p style={{ color: message.tone === "error" ? "crimson" : "green" }}>
          {message.text}
        </p>
      ) : null}

      {courts.length === 0 ? (
        <p>등록된 코트가 없습니다.</p>
      ) : (
        <div>
          {courts.map((court) => (
            <div
              key={court.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <strong>{court.name}</strong>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => handleDelete(court.id)}
                  disabled={isPending && pendingKey === court.id}
                >
                  {isPending && pendingKey === court.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
